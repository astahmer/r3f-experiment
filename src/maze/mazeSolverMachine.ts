import { pickOne } from "@pastable/utils";
import { assign, createMachine, send, sendParent } from "xstate";

import { MazeCell } from "./mazeMachine";

export const createSolveMachine = ({ grid, stepDelayInMs }: { grid: Array<MazeCell[]>; stepDelayInMs?: number }) => {
    console.log(grid);
    const paths = grid.flat().filter((cell) => cell.state === "path");
    paths.forEach((cell) => (cell.display = "path"));

    const initialCtx = {
        grid,
        unvisitedsRoot: paths,
        paths: [...paths],
        rootCell: null as MazeCell,
        unvisitedsNeighbors: [] as Array<MazeCell>,
        currentCell: null as MazeCell,
        steps: [] as Array<MazeCell["id"]>,
    };
    const makeSnapshot = (current: typeof initialCtx): typeof initialCtx => ({
        ...current,
        grid: [...current.grid],
        unvisitedsRoot: [...current.unvisitedsRoot],
        paths: [...initialCtx.paths],
        rootCell: { ...current.rootCell },
        unvisitedsNeighbors: [...current.unvisitedsNeighbors],
        currentCell: { ...current.currentCell },
        steps: [...current.steps],
    });

    return createMachine(
        {
            id: "solver",
            context: {
                ...initialCtx,
                lastBranchSnapshot: null as typeof initialCtx,
                completePaths: [] as Array<Array<MazeCell["id"]>>,
                currentPaths: [] as Array<Array<MazeCell["id"]>>,
                mode: "manual",
            },
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
                done: { type: "final", entry: [(ctx) => console.log("done solving", ctx)] },
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
                    ctx.paths.forEach((cell) => {
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
                    const currentPaths = ctx.currentPaths.concat(completedPath);
                    const longest = Math.max(...currentPaths.map((path) => path.length));
                    // TODO could be multiple equal longest path ?
                    const longestPath = currentPaths.find((path) => path.length === longest);

                    return {
                        ...ctx,
                        lastBranchSnapshot: null,
                        unvisitedsNeighbors: [],
                        currentCell: null,
                        steps: [],
                        currentPaths: [],
                        completePaths: ctx.completePaths.concat([longestPath]),
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
                        )[0]; // TODO pickOne instead of first ?

                        // Check parent branch snapshot
                        if (!currentCell) {
                            prevBranch = lastBranchSnapshot as any;
                            lastBranchSnapshot = (lastBranchSnapshot as any).lastBranchSnapshot;
                        }
                    }

                    const steps = lastBranchSnapshot.steps.concat(currentCell.id);
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
                        )[0]; // TODO pickOne instead of first ?

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

const getUnvisitedNeighbors = (cell: MazeCell) =>
    Object.values(cell.neighbors).filter((next) => next && next.state === "path");

// TODO git stash / check prev commit to see if it was already not doing ALL branches
// context: seems like only the first (oldest) snapshot is used, ignoring the ones made along the way
