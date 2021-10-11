import { pickOne } from "@pastable/utils";
import { assign, createMachine, sendParent } from "xstate";

import { MazeCell } from "./mazeMachine";

export const createSolveMachine = ({ grid }: { grid: Array<MazeCell[]> }) => {
    console.log(grid);
    const paths = grid.flat().filter((cell) => cell.state === "path");
    paths.forEach((cell) => (cell.display = "path"));

    const ctx = {
        grid,
        unvisitedsRoot: paths,
        paths: [...paths],
        rootCell: null as MazeCell,
        unvisitedsNeighbors: [] as Array<MazeCell>,
        currentCell: null as MazeCell,
        steps: [] as Array<MazeCell["id"]>,
        // parentCell: null as MazeCell,
        // stepsFromRoot: [] as Array<MazeCell["id"]>,
        // branchCell: null as MazeCell,
    };
    const makeSnapshot = (current: typeof ctx): typeof ctx => ({
        ...current,
        grid: [...current.grid],
        unvisitedsRoot: [...current.unvisitedsRoot],
        paths: [...ctx.paths],
        rootCell: { ...current.rootCell },
        unvisitedsNeighbors: [...current.unvisitedsNeighbors],
        currentCell: { ...current.currentCell },
        steps: [...current.steps],
    });

    return createMachine(
        {
            id: "solver",
            initial: "ready",
            context: {
                ...ctx,
                lastBranchSnapshot: null as typeof ctx,
                completePaths: [] as Array<Array<MazeCell["id"]>>,
                currentPaths: [] as Array<Array<MazeCell["id"]>>,
            },
            states: {
                ready: {
                    on: { STEP: { target: "started", actions: ["setRoot", "updateGrid"] } },
                },
                started: {
                    on: {
                        STEP: [
                            // {
                            //     actions: ["setCurrentNeighbor", "updateGrid"],
                            //     cond: "hasUnvisitedsNeighborsAndNoCurrentCell",
                            // },
                            {
                                actions: ["setCellToPreviousBranch", "updateGrid"],
                                // cond: "isNotRootCell",
                                cond: "canBranch",
                            },
                            { actions: ["setRoot", "updateGrid"], cond: "hasUnvisitedsRoot" },
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
                        steps: [],
                        lastBranchSnapshot: null,
                    };

                    const lastBranchSnapshot =
                        current.unvisitedsNeighbors.length > 1 ? makeSnapshot(current) : ctx.lastBranchSnapshot;
                    return { ...current, lastBranchSnapshot };
                }),
                setCurrentNeighbor: assign((ctx) => {
                    const currentCell = ctx.unvisitedsNeighbors[0];
                    const steps = ctx.steps.concat(currentCell.id);
                    console.log({ currentCell }, steps);

                    currentCell.display = "current";

                    const current = {
                        ...ctx,
                        // unvisitedsNeighbors: ctx.unvisitedsNeighbors.slice(1),
                        unvisitedsNeighbors: getUnvisitedNeighbors(currentCell).filter(
                            (cell) => !steps.includes(cell.id)
                        ),
                        steps,
                        currentCell,
                    };
                    console.log(current.unvisitedsNeighbors);
                    const lastBranchSnapshot =
                        current.unvisitedsNeighbors.length > 1 ? makeSnapshot(current) : ctx.lastBranchSnapshot;

                    // TODO 2 pb à fix:
                    // 1: après setCurrentNeighbor une branche est ignorée
                    // 2: y'a difficillement un lastBranchSnapshot.lastBranchSNapshot
                    //
                    console.log("makeSnapshot", { ctx, lastBranchSnapshot });
                    return { ...current, lastBranchSnapshot };
                }),
                setCellToPreviousBranch: assign((ctx) => {
                    let currentCell: MazeCell = ctx.currentCell;
                    let lastBranchSnapshot = ctx.lastBranchSnapshot;
                    let neighbors = [];
                    console.log("setCellToPreviousBranch");

                    neighbors = Object.values(currentCell?.neighbors || {}).filter(
                        (next) => next && next.state === "path" && !ctx.steps.includes(next.id)
                    );
                    currentCell = pickOne(neighbors);

                    if (!currentCell) {
                        if (!lastBranchSnapshot) {
                            console.log("no current cell no snapshot", { ctx });

                            return {
                                ...ctx,
                                lastBranchSnapshot: null,
                                unvisitedsNeighbors: [],
                                currentCell,
                                steps: [],
                            };
                        }

                        let prevBranch = ctx;
                        while (!currentCell && lastBranchSnapshot) {
                            currentCell = lastBranchSnapshot.unvisitedsNeighbors.filter(
                                (cell) => !prevBranch.steps.includes(cell.id)
                            )[0];
                            if (!currentCell) {
                                prevBranch = lastBranchSnapshot as any;
                                lastBranchSnapshot = (lastBranchSnapshot as any).lastBranchSnapshot;
                            }
                        }

                        console.log("will change path", { currentCell, lastBranchSnapshot, ctx });
                        if (!currentCell) {
                            console.log("WILL CHANGE ROOT");

                            const completedPath = ctx.steps.concat(ctx.currentCell.id);
                            const currentPaths = ctx.currentPaths.concat(completedPath);
                            const longest = Math.max(...currentPaths.map((path) => path.length));
                            // TODO could be multiple equal longest path ?
                            const longestPath = currentPaths.find((path) => path.length === longest);

                            return {
                                ...ctx,
                                lastBranchSnapshot: null,
                                unvisitedsNeighbors: [],
                                currentCell,
                                steps: [],
                                currentPaths: [],
                                completePaths: ctx.completePaths.concat([longestPath]),
                            };
                        }

                        const steps = lastBranchSnapshot.steps.concat(currentCell.id);
                        console.log("-----WILL CHANGE BRANCH FROM LAST SNAPSHOT", {
                            currentCell,
                            lastBranchSnapshot,
                            ctx,
                            steps,
                        });

                        ctx.paths.forEach((cell) => {
                            if (cell.id === ctx.rootCell.id) return;
                            if (steps.includes(cell.id)) {
                                cell.display = "blocked";
                            } else {
                                cell.display = "path";
                            }
                        });
                        currentCell.display = "current";

                        const unvisitedsNeighbors = lastBranchSnapshot.unvisitedsNeighbors.filter(
                            (cell) => !ctx.steps.concat(currentCell.id).includes(cell.id)
                        );

                        const completedPath = ctx.steps.concat(ctx.currentCell.id);
                        console.log({ unvisitedsNeighbors, completedPath });

                        return {
                            ...ctx,
                            lastBranchSnapshot: { ...lastBranchSnapshot, unvisitedsNeighbors },
                            unvisitedsNeighbors,
                            steps,
                            currentPaths: ctx.currentPaths.concat([completedPath]),
                            currentCell,
                        };
                    }

                    if (!lastBranchSnapshot) {
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
                        console.log("current Cell but no snapshot", { currentCell, ctx, lastBranchSnapshot, steps });

                        ctx.paths.forEach((cell) => {
                            if (cell.id === ctx.rootCell.id) return;
                            if (steps.includes(cell.id)) {
                                cell.display = "blocked";
                            } else {
                                cell.display = "path";
                            }
                        });
                        currentCell.display = "current";

                        return { ...current, lastBranchSnapshot };
                    }

                    const steps = ctx.steps.concat(ctx.currentCell.id);
                    console.log("current Cell WITH snapshot", { currentCell, lastBranchSnapshot, ctx, steps });

                    ctx.paths.forEach((cell) => {
                        if (cell.id === ctx.rootCell.id) return;
                        if (steps.includes(cell.id)) {
                            cell.display = "blocked";
                        } else {
                            cell.display = "path";
                        }
                    });
                    currentCell.display = "current";

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
                // hasUnvisitedsNeighborsAndNoCurrentCell: (ctx) =>
                //     Boolean(!ctx.currentCell && ctx.unvisitedsNeighbors.length),
                // isNotRootCell: (ctx) => !Boolean(ctx.lastBranchSnapshot),
                canBranch: (ctx) => Boolean(ctx.currentCell || ctx.lastBranchSnapshot),
            },
        }
    );
};

const getUnvisitedNeighbors = (cell: MazeCell) =>
    Object.values(cell.neighbors).filter((next) => next && next.state === "path");

// const pathCells = ctx.grid.flat().filter((cell) => cell.state === "path");

//                     function traverseCell(cell: MazeCell, steps: Array<MazeCell["id"]>): Array<MazeCell["id"]> {
//                         cell.display = "path";
//                         // steps.push(cell.id);
//                         const stepsFromHere = steps.concat(cell.id);
//                         const neighbors = Object.values(cell.neighbors).filter(
//                             (next) => next && next.state === "path" && !stepsFromHere.includes(next.id)
//                         );
//                         if (!neighbors) cell.display = "end";

//                         const paths = neighbors.map((next) => traverseCell(next, stepsFromHere.concat(next.id)));
//                         const longest = Math.max(...paths.map((path) => path.length));

//                         // TODO could be multiple ?
//                         const longestPath = paths.find((path) => path.length === longest);
//                         console.log({
//                             cell,
//                             steps,
//                             paths,
//                             longest,
//                             longestPath,
//                             return: stepsFromHere.concat(longestPath),
//                         });
//                         // console.log(cell, steps, neighbors);

//                         return stepsFromHere.concat(longestPath);
//                     }

//                     const clone = [...pathCells.map((cell) => ({ ...cell }))];
//                     const paths = pathCells.map((cell) => {
//                         pathCells.forEach((cell) => (cell.display = clone.find((item) => item.id === cell.id).display));
//                         return traverseCell(cell, []);
//                     });
//                     pathCells.forEach((cell) => (cell.display = clone.find((item) => item.id === cell.id).display));
//                     console.log(clone);
//                     console.log(
//                         paths,
//                         paths.map((path) => paths.length),
//                         Math.min(...paths.map((path) => paths.length)),
//                         Math.max(...paths.map((path) => paths.length))
//                     );

// started: {
//     initial: "atRoot",
//     // on: { "*": { actions: sendParent((ctx) => ({ type: "updateGrid", value: ctx.grid })) } },
//     states: {
//         atRoot: {
//             on: {
//                 STEP: [
//                     {
//                         target: "branch",
//                         actions: ["setCurrentNeighbor", "updateGrid"],
//                         cond: "hasUnvisitedsNeighborsAndNoCurrentCell",
//                     },
//                     { target: "atRoot", actions: ["setRoot", "updateGrid"], cond: "hasUnvisitedsRoot" },
//                     { target: "#solver.done" },
//                 ],
//             },
//         },
//         branch: {
//             on: {
//                 STEP: [
//                     {
//                         target: "branch",
//                         actions: ["setCurrentNeighbor", "updateGrid"],
//                         cond: "hasUnvisitedsNeighborsAndNoCurrentCell",
//                     },
//                     {
//                         target: "branch",
//                         actions: ["setCellToPreviousBranch", "updateGrid"],
//                         // cond: "isNotRootCell",
//                         cond: "canBranch",
//                     },
//                     { target: "atRoot", actions: ["setRoot", "updateGrid"], cond: "hasUnvisitedsRoot" },
//                     { target: "#solver.done" },
//                 ],
//             },
//         },
//         // blocked: { always:}
//     },
// },
