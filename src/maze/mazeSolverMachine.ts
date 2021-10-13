import { pick, pickOne } from "@pastable/utils";
import { assign, createMachine, send, sendParent } from "xstate";

import { MazeCell } from "./mazeMachine";

export const createSolveMachine = ({ grid, stepDelayInMs }: { grid: Array<MazeCell[]>; stepDelayInMs?: number }) => {
    console.log(grid);
    const start = new Date();
    const paths = grid.flat().filter((cell) => cell.state === "path");
    paths.forEach((cell) => (cell.display = "path"));

    const makeSnapshot = (current: Partial<MazeSolverContext>) =>
        pick(current, ["lastBranchSnapshot", "unvisitedsNeighbors", "steps", "currentCell"]) as LastBranchSnapshot;

    return createMachine(
        {
            id: "solver",
            context: {
                mode: "manual",
                grid,
                pathCells: [...paths],
                //
                unvisitedsRoot: paths,
                completePaths: [],
                //
                rootCell: null,
                currentPaths: [],
                currentCell: null,
                unvisitedsNeighbors: [],
                steps: [],
                lastBranchSnapshot: null,
            } as MazeSolverContext,
            after: { [stepDelayInMs]: { actions: "autoStep", cond: "isAutoRun" } },
            initial: "atRoot",
            entry: ["drawGrid", "updateGrid"],
            states: {
                atRoot: { entry: ["setRoot"] },
                pathing: {
                    initial: "firstPathFromRoot",
                    states: {
                        firstPathFromRoot: {},
                        inBranch: {},
                        willChangeRoot: {
                            always: [
                                { target: "#solver.atRoot", cond: "hasUnvisitedsRoot" },
                                { target: "#solver.done" },
                            ],
                        },
                        willChangeBranch: {
                            always: [
                                { target: "inBranch", cond: "hasBranchSnapshot", actions: "autoStep" },
                                { target: "#solver.atRoot", cond: "hasUnvisitedsRoot" },
                                { target: "#solver.done" },
                            ],
                        },
                    },
                },
                done: {
                    type: "final",
                    entry: [
                        (ctx) => {
                            console.log("done solving", ctx);
                            console.log((new Date().getTime() - start.getTime()) / 1000);
                        },
                    ],
                },
            },
            on: {
                TOGGLE_MODE: { actions: ["toggleMode", "autoStep"] },
                SOLVE_STEP: [
                    {
                        target: "#solver.pathing.willChangeBranch",
                        actions: "resetCurrentPath",
                        cond: "isDeadEndWithoutSnapshot",
                    },
                    {
                        target: "#solver.pathing.willChangeRoot",
                        actions: "addLongestPathFromRootAndResetCurrentPaths",
                        cond: { type: "shouldChangePath", mode: "trueIfShouldChangeRoot" },
                    },
                    {
                        target: "#solver.pathing.willChangeBranch",
                        actions: "addCompletePathToCurrentPathList",
                        cond: { type: "shouldChangePath", mode: "trueIfShouldChangeBranch" },
                    },
                    {
                        target: "#solver.pathing.inBranch",
                        actions: "followPath",
                    },
                    {
                        target: "#solver.atRoot",
                        actions: "setRoot",
                        cond: "hasUnvisitedsRoot",
                    },
                    { target: "#solver.done" },
                ],
            },
        },
        {
            actions: {
                drawGrid: (ctx) => {
                    ctx.pathCells.forEach((cell) => {
                        if (ctx.steps.includes(cell.id)) cell.display = "blocked";
                        else cell.display = "path";
                    });

                    if (ctx.currentCell) ctx.currentCell.display = "current";
                    if (ctx.rootCell) ctx.rootCell.display = "start";
                },
                updateGrid: sendParent((ctx) => ({ type: "UPDATE_GRID", value: ctx.grid })),
                autoStep: send("SOLVE_STEP"),
                toggleMode: assign({ mode: (ctx) => (ctx.mode === "auto" ? "manual" : "auto") }),
                setRoot: assign((ctx) => {
                    const rootCell = ctx.unvisitedsRoot[0];
                    const current = {
                        ...ctx,
                        completePaths: ctx.completePaths.concat(ctx.steps),
                        //
                        unvisitedsRoot: ctx.unvisitedsRoot.slice(1),
                        unvisitedsNeighbors: getUnvisitedNeighbors(rootCell),
                        rootCell,
                        currentCell: rootCell,
                        steps: [rootCell.id],
                        lastBranchSnapshot: null,
                    };

                    const lastBranchSnapshot =
                        current.unvisitedsNeighbors.length > 1 ? makeSnapshot(current) : ctx.lastBranchSnapshot;

                    return { ...current, lastBranchSnapshot };
                }),
                resetCurrentPath: assign((ctx) => ({ ...ctx, unvisitedsNeighbors: [], steps: [] })),
                addLongestPathFromRootAndResetCurrentPaths: assign((ctx) => {
                    const completedPath = ctx.steps.concat(ctx.currentCell.id);
                    const currentPaths = ctx.currentPaths.concat([completedPath]);
                    const longest = Math.max(...currentPaths.map((path) => path.length));

                    const longestPaths = currentPaths.filter((path) => path.length === longest);

                    return {
                        ...ctx,
                        lastBranchSnapshot: null,
                        unvisitedsNeighbors: [],
                        currentCell: null,
                        steps: [],
                        currentPaths: [],
                        completePaths: ctx.completePaths.concat(longestPaths),
                    };
                }),
                addCompletePathToCurrentPathList: assign((ctx) => {
                    let currentCell: MazeCell;
                    let lastBranchSnapshot = ctx.lastBranchSnapshot;

                    let prevBranch = ctx;

                    // Try backtracing to a branch with unvisiteds neighbors
                    while (!currentCell && lastBranchSnapshot) {
                        currentCell = lastBranchSnapshot.unvisitedsNeighbors.filter(
                            (cell) => !prevBranch.steps.includes(cell.id)
                        )[0];

                        // Check parent branch snapshot
                        if (!currentCell) {
                            prevBranch = lastBranchSnapshot as any;
                            lastBranchSnapshot = (lastBranchSnapshot as any).lastBranchSnapshot;
                        }
                    }

                    const steps = lastBranchSnapshot.steps.concat(lastBranchSnapshot.currentCell.id, currentCell.id);
                    const unvisitedsNeighbors = lastBranchSnapshot.unvisitedsNeighbors.filter(
                        (cell) => !ctx.steps.concat(currentCell.id).includes(cell.id)
                    );
                    const completedPath = ctx.steps.concat(ctx.currentCell.id);

                    return {
                        ...ctx,
                        lastBranchSnapshot: { ...lastBranchSnapshot, unvisitedsNeighbors },
                        unvisitedsNeighbors,
                        steps,
                        currentPaths: ctx.currentPaths.concat([completedPath]),
                        currentCell,
                    };
                }),
                followPath: assign((ctx) => {
                    const neighbors = Object.values(ctx.currentCell.neighbors).filter(
                        (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                    );
                    const currentCell = neighbors[0];
                    const steps = ctx.steps.concat(ctx.steps.includes(ctx.currentCell.id) ? [] : ctx.currentCell.id);

                    const current = {
                        ...ctx,
                        unvisitedsNeighbors: getUnvisitedNeighbors(currentCell).filter(
                            (cell) => !steps.includes(cell.id)
                        ),
                        steps,
                        currentCell,
                    };

                    const lastBranchSnapshot =
                        current.unvisitedsNeighbors.length > 1 ? makeSnapshot(current) : ctx.lastBranchSnapshot;

                    return { ...current, lastBranchSnapshot };
                }),
            },
            guards: {
                hasUnvisitedsRoot: (ctx) => Boolean(ctx.unvisitedsRoot.length),
                isAutoRun: (ctx) => ctx.mode === "auto",
                hasBranchSnapshot: (ctx) => Boolean(ctx.lastBranchSnapshot),
                isDeadEndWithoutSnapshot: (ctx) => {
                    const neighbors = Object.values(ctx.currentCell?.neighbors || {}).filter(
                        (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                    );
                    const neighbor = pickOne(neighbors);

                    return !neighbor && !ctx.lastBranchSnapshot;
                },
                shouldChangePath: (ctx, _event, { cond }) => {
                    const neighbors = Object.values(ctx.currentCell.neighbors).filter(
                        (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                    );
                    let neighbor = neighbors[0];
                    if (neighbor) return false;

                    let prevBranch = ctx;
                    let lastBranchSnapshot = ctx.lastBranchSnapshot;

                    // Try backtracing to a branch with unvisiteds neighbors
                    while (!neighbor && lastBranchSnapshot) {
                        neighbor = lastBranchSnapshot.unvisitedsNeighbors.filter(
                            (cell) => !prevBranch.steps.includes(cell.id)
                        )[0];

                        // Check parent branch snapshot
                        if (!neighbor) {
                            prevBranch = lastBranchSnapshot as any;
                            lastBranchSnapshot = (lastBranchSnapshot as any).lastBranchSnapshot;
                        }
                    }

                    // @ts-ignore
                    const mode = cond.mode;

                    // Ifs no unvisted neighbor even in parent branches, that means
                    // We have checked all possible paths branches from that rootCell and must choose another one
                    // If one remains, that means we can try another branch from that rootCell using a previous snapshot
                    return mode === "trueIfShouldChangeRoot" ? !neighbor : Boolean(neighbor);
                },
            },
        }
    );
};

export interface MazeSolverContext {
    mode: "manual" | "auto";
    grid: Array<MazeCell[]>;
    /** List of all cells with state === "path" */
    pathCells: MazeCell[];
    //
    //
    /** Path cells that were not yet tried as rootCell */
    unvisitedsRoot: MazeCell[];
    /** List of all longest paths that were completed from different rootCell */
    completePaths: Array<Array<MazeCell["id"]>>;
    //
    //
    /** Cell from which all possible paths are going to be tried */
    rootCell: MazeCell;
    /** List of all current completed paths from a rootCell to a currentCell  */
    currentPaths: Array<Array<MazeCell["id"]>>;
    /** Current step cell on which we will pick the next step from its neighbors */
    currentCell: MazeCell;
    /** Keeps track of currentCell unvisiteds neighbors */
    unvisitedsNeighbors: MazeCell[];
    /** Current path steps (cell.id) */
    steps: Array<MazeCell["id"]>;
    /** Last branch (cell before a choice has been made due to multiple unvisiteds neighbors) snasphot (current partial context state) */
    lastBranchSnapshot: LastBranchSnapshot;
}
interface LastBranchSnapshot extends Pick<MazeSolverContext, "steps" | "unvisitedsNeighbors" | "currentCell"> {
    lastBranchSnapshot: LastBranchSnapshot | null;
}

const getUnvisitedNeighbors = (cell: MazeCell) =>
    Object.values(cell.neighbors).filter((next) => next && next.state === "path");
