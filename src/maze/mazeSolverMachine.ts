import { pickOne } from "@pastable/utils";
import { assign, createMachine, send, sendParent } from "xstate";

import { MazeCell } from "./mazeMachine";

export const createSolveMachine = ({ grid }: { grid: Array<MazeCell[]> }) => {
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

    function drawCurrentStep({
        ctx,
        steps,
        currentCell,
    }: {
        ctx: typeof initialCtx;
        steps: string[];
        currentCell: MazeCell;
    }) {
        ctx.paths.forEach((cell) => {
            if (cell.id === ctx.rootCell.id) return;
            if (steps.includes(cell.id)) {
                cell.display = "blocked";
            } else {
                cell.display = "path";
            }
        });
        currentCell.display = "current";
    }

    return createMachine(
        {
            id: "solver",
            initial: "ready",
            context: {
                ...initialCtx,
                lastBranchSnapshot: null as typeof initialCtx,
                completePaths: [] as Array<Array<MazeCell["id"]>>,
                currentPaths: [] as Array<Array<MazeCell["id"]>>,
            },
            states: {
                // TODO rm ?
                ready: {
                    on: { STEP: { target: "started", actions: ["setRoot", "updateGrid"] } },
                },
                started: {
                    id: "started",
                    initial: "atRoot",
                    states: {
                        atRoot: {},
                        pathing: {
                            initial: "unique",
                            states: {
                                unique: {},
                                branching: {},
                                willChangeRoot: {
                                    always: [
                                        {
                                            target: "#started.atRoot",
                                            actions: ["setRoot", "updateGrid"],
                                            cond: "hasUnvisitedsRoot",
                                        },
                                        { target: "#solver.done" },
                                    ],
                                },
                                willChangeBranch: {
                                    always: [
                                        {
                                            target: "branching",
                                            actions: ["updateGrid"],
                                            cond: "hasBranchSnapshot",
                                        },
                                        {
                                            target: "#started.atRoot",
                                            actions: ["setRoot", "updateGrid"],
                                            cond: "hasUnvisitedsRoot",
                                        },
                                        { target: "#solver.done" },
                                    ],
                                },
                                autoRun: {
                                    after: {
                                        [100]: [
                                            { target: "#solver.done", cond: "hasNoUnvisitedsRoot" },
                                            { target: "#started.pathing.autoRun", actions: "autoStep" },
                                        ],
                                    },
                                    on: { PAUSE: { target: "branching" } },
                                },
                            },
                        },
                    },
                    on: {
                        AUTORUN: { target: "#started.pathing.autoRun" },
                        STEP: [
                            {
                                target: ".pathing.willChangeBranch",
                                actions: ["toWeirdState", "updateGrid"],
                                cond: "hasWeirdState",
                            },
                            {
                                target: ".pathing.willChangeRoot",
                                actions: ["addLongestPathFromRoot", "updateGrid"],
                                cond: { type: "shouldChangePath", mode: "trueIfShouldChangeRoot" },
                            },
                            {
                                target: ".pathing.willChangeBranch",
                                actions: ["addCompletePathToCurrentPathList", "updateGrid"],
                                cond: { type: "shouldChangePath", mode: "trueIfShouldChangeBranch" },
                            },
                            {
                                target: ".pathing.unique",
                                actions: ["followPathAndMakeSnapbranchIfMultipleUnvisitedsNeighbor", "updateGrid"],
                                // cond: "isNotRootCell",
                                cond: "isUniquePath",
                                // hasUnvisitedsNeighbor
                            },
                            {
                                target: ".pathing.branching",
                                actions: ["tryAnotherBranchFromLastSnapshot", "updateGrid"],
                                // cond: "isNotRootCell",
                                // hasUnvisitedsNeighbor
                            },
                            {
                                target: ".atRoot",
                                actions: ["setRoot", "updateGrid"],
                                cond: "hasUnvisitedsRoot",
                            },
                            { target: "#solver.done" },
                        ],
                    },
                },
                done: { entry: [(ctx) => console.log("done solving", ctx)] },
            },
        },
        {
            actions: {
                updateGrid: sendParent((ctx) => ({ type: "UPDATE_GRID", value: ctx.grid })),
                autoStep: send("STEP"),
                setRoot: assign((ctx) => {
                    const rootCell = ctx.unvisitedsRoot[0];
                    console.log({ rootCell, ctx });
                    ctx.paths.forEach((cell) => (cell.display = "path"));
                    rootCell.display = "start";

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
                toWeirdState: assign(
                    // @ts-ignore
                    (ctx) => console.log("!!!!!WEIRD STATE", ctx) || { ...ctx, unvisitedsNeighbors: [], steps: [] }
                ),
                addLongestPathFromRoot: assign((ctx) => {
                    console.log("addLongestPathFromRoot - WILL CHANGE ROOT");

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
                    console.log("addCompletePathToCurrentPathList");

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
                    // console.log("-----WILL CHANGE BRANCH FROM LAST SNAPSHOT", {
                    //     currentCell,
                    //     lastBranchSnapshot,
                    //     ctx,
                    //     steps,
                    // });

                    drawCurrentStep({ ctx, steps, currentCell });

                    const unvisitedsNeighbors = lastBranchSnapshot.unvisitedsNeighbors.filter(
                        (cell) => !ctx.steps.concat(currentCell.id).includes(cell.id)
                    );

                    const completedPath = ctx.steps.concat(ctx.currentCell.id);
                    // console.log({ unvisitedsNeighbors, completedPath });

                    return {
                        ...ctx,
                        lastBranchSnapshot: { ...lastBranchSnapshot, unvisitedsNeighbors },
                        unvisitedsNeighbors,
                        steps,
                        currentPaths: ctx.currentPaths.concat([completedPath]),
                        currentCell,
                    };
                }),
                followPathAndMakeSnapbranchIfMultipleUnvisitedsNeighbor: assign((ctx) => {
                    console.log("followPathAndMakeSnapbranchIfMultipleUnvisitedsNeighbor");
                    const neighbors = Object.values(ctx.currentCell.neighbors).filter(
                        (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                    );
                    const currentCell = neighbors[0];

                    console.log("no snapshot");
                    const steps = ctx.steps.concat(currentCell.id);

                    const current = {
                        ...ctx,
                        // unvisitedsNeighbors: ctx.unvisitedsNeighbors.slice(1),
                        unvisitedsNeighbors: getUnvisitedNeighbors(currentCell).filter(
                            (cell) => !steps.includes(cell.id)
                        ),
                        steps,
                        currentCell,
                    };
                    const lastBranchSnapshot =
                        current.unvisitedsNeighbors.length > 1 ? makeSnapshot(current) : ctx.lastBranchSnapshot;
                    // console.log("current Cell but no snapshot", { currentCell, ctx, lastBranchSnapshot, steps });

                    drawCurrentStep({ ctx, steps, currentCell });

                    return { ...current, lastBranchSnapshot };
                }),
                tryAnotherBranchFromLastSnapshot: assign((ctx) => {
                    // console.log("tryAnotherBranchFromLastSnapshot");

                    const neighbors = Object.values(ctx.currentCell.neighbors).filter(
                        (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                    );
                    const currentCell = neighbors[0];
                    const lastBranchSnapshot = ctx.lastBranchSnapshot;

                    const steps = ctx.steps.concat(ctx.currentCell.id);
                    // console.log("current Cell WITH snapshot", { currentCell, lastBranchSnapshot, ctx, steps });

                    drawCurrentStep({ ctx, steps, currentCell });

                    console.log("WITH snapshot");
                    return {
                        ...ctx,
                        lastBranchSnapshot,
                        unvisitedsNeighbors: lastBranchSnapshot.unvisitedsNeighbors.slice(1),
                        steps,
                        currentCell,
                    };
                }),
            },
            guards: {
                hasUnvisitedsRoot: (ctx) => Boolean(ctx.unvisitedsRoot.length),
                hasNoUnvisitedsRoot: (ctx) => Boolean(!ctx.unvisitedsRoot.length),
                hasBranchSnapshot: (ctx) => Boolean(ctx.lastBranchSnapshot),
                // canBranch: (ctx) => Boolean(ctx.currentCell || ctx.lastBranchSnapshot),
                isUniquePath: (ctx) => Boolean(ctx.currentCell && !ctx.lastBranchSnapshot),
                hasWeirdState: (ctx) => {
                    const neighbors = Object.values(ctx.currentCell?.neighbors || {}).filter(
                        (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                    );
                    const neighbor = pickOne(neighbors);

                    return !neighbor && !ctx.lastBranchSnapshot;
                },
                // hasUnvisitedsNeighbor: (ctx) => {
                //     const neighbors = Object.values(ctx.currentCell?.neighbors || {}).filter(
                //         (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                //     );
                //     const neighbor = pickOne(neighbors);

                //     return Boolean(neighbor);
                // },
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

                    // console.log("will change path", { neighbor, lastBranchSnapshot, ctx });

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
