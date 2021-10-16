import { last } from "@pastable/core";
import { ContextFrom } from "xstate";
import { raise } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";

import { MazeCell, MazeGridType } from "./mazeGeneratorMachine";

export const createPathFinderMachine = ({ grid, stepDelayInMs }: { grid: MazeGridType; stepDelayInMs: number }) => {
    const paths = grid.flat().filter((cell) => cell.state === "path");
    const branchCells = paths.filter((cell) => getPathNeighbors(cell).length > 2);
    const first = branchCells[0];

    const model = createModel({
        mode: "manual" as "manual" | "auto",
        grid,
        pathCells: paths,
        /** Every cells that have more than 2 paths possible (=intersection) to go from */
        branchCells: branchCells.map((cell) => cell.id),
        unvisitedsBranchCells: branchCells.filter((cell) => cell.id !== first.id),
        rootBranchCell: first,
        unvisitedsDirections: getPathNeighbors(first),
        currentPaths: [] as Array<Array<MazeCell["id"]>>,
        currentCell: first,
        steps: [first.id] as Array<MazeCell["id"]>,
    });

    return model.createMachine(
        {
            id: "finder",
            context: model.initialContext,
            initial: "finding",
            states: {
                finding: {
                    initial: "pathing",
                    entry: ["drawGrid"],
                    after: { [stepDelayInMs]: { actions: raise("FINDER_STEP"), cond: "isAutoRun" } },
                    states: {
                        pathing: {},
                        willChangePath: {
                            entry: "addStepsToCurrentPaths",
                            always: [
                                { target: "willChangeBranch", cond: "hasUnvisitedsDirections" },
                                { target: "willChangeRoot", cond: "hasUnvisitedsBranchCells" },
                                { target: "#finder.done" },
                            ],
                        },
                        willChangeRoot: { entry: "setRoot" },
                        willChangeBranch: { entry: "setCurrentCell" },
                    },
                    on: {
                        TOGGLE_MODE: { actions: ["toggleMode", raise("FINDER_STEP")] },
                        FINDER_STEP: [
                            { target: "finding.willChangePath", cond: "hasReachedDeadEnd" },
                            { target: "finding.willChangePath", actions: "step", cond: "hasReachedAnotherBranchCell" },
                            { target: "finding.pathing", actions: "step" },
                        ],
                    },
                },
                done: {
                    entry: (ctx) => {
                        console.log(ctx);
                        const subPathsByBranches: Record<MazeCell["id"], Array<MazeCell["id"][]>> = branchCells.reduce(
                            (acc, branch) => ({
                                ...acc,
                                [branch.id]: ctx.currentPaths.filter((path) => path[0] === branch.id),
                            }),
                            {}
                        );

                        console.log(subPathsByBranches);

                        return;

                        const completedPaths: Array<MazeCell["id"][]> = [];
                        const completedPathsByStart: Record<
                            MazeCell["id"],
                            Array<MazeCell["id"][]>
                        > = Object.fromEntries(branchCells.map((cell) => [cell.id, []]));

                        function traverseSubPath(subPath: Array<MazeCell["id"]>, currentSteps: Array<MazeCell["id"]>) {
                            const endsWithId = last(subPath);
                            const nextBranch = subPathsByBranches[endsWithId];

                            // Reached a dead-end
                            if (!nextBranch) {
                                const path = currentSteps.concat(subPath);
                                completedPathsByStart[path[0]].push(path);
                                console.log(completedPathsByStart, completedPaths);
                                return completedPaths.push(path);
                            }

                            const nextSteps = currentSteps.concat(subPath.slice(0, -1));
                            const branches = nextBranch.filter(
                                (nextSubPath) => !nextSteps.some((step) => nextSubPath.includes(step))
                            );

                            // Reached a point where we would be stepping twice on the same cell
                            if (!branches.length) {
                                completedPathsByStart[nextSteps[0]].push(nextSteps);
                                console.log(completedPathsByStart, completedPaths);
                                return completedPaths.push(nextSteps);
                            }

                            branches.forEach((nextSubPath) => traverseSubPath(nextSubPath, nextSteps));
                        }

                        branchCells.forEach((branch) =>
                            subPathsByBranches[branch.id].forEach((subPath) => traverseSubPath(subPath, []))
                        );

                        const longest = Math.max(...completedPaths.map((path) => path.length));
                        const longestPaths = completedPaths.filter((path) => path.length === longest);

                        console.log(longestPaths);
                        // TODO rm branchCells next to another untill none are close to any other
                    },
                },
            },
        },
        {
            actions: {
                toggleMode: model.assign({ mode: (ctx) => (ctx.mode === "auto" ? "manual" : "auto") }),
                drawGrid: (ctx) => {
                    ctx.pathCells.forEach((cell) => {
                        if (ctx.steps.includes(cell.id)) cell.display = "blocked";
                        else cell.display = "path";
                    });

                    if (ctx.currentCell) ctx.currentCell.display = "current";
                    if (ctx.rootBranchCell) ctx.rootBranchCell.display = "start";
                },
                setRoot: model.assign((ctx) => {
                    const rootBranchCell = ctx.unvisitedsBranchCells[0];

                    return {
                        ...ctx,
                        rootBranchCell,
                        currentCell: rootBranchCell,
                        unvisitedsBranchCells: ctx.unvisitedsBranchCells.filter(
                            (cell) => cell.id !== rootBranchCell.id
                        ),
                        unvisitedsDirections: getPathNeighbors(rootBranchCell),
                        steps: [rootBranchCell.id],
                    };
                }),
                addStepsToCurrentPaths: model.assign((ctx) => ({
                    ...ctx,
                    currentPaths: ctx.currentPaths.concat([ctx.steps]),
                    steps: [],
                })),
                setCurrentCell: model.assign((ctx) => {
                    const currentCell = ctx.unvisitedsDirections[0];

                    return {
                        ...ctx,
                        currentCell,
                        steps: [ctx.rootBranchCell.id, currentCell.id], // only diff with step
                        unvisitedsDirections: ctx.unvisitedsDirections.filter((cell) => cell.id !== currentCell.id),
                    };
                }),
                step: model.assign((ctx) => {
                    const currentCell = getNextStep(ctx);

                    return {
                        ...ctx,
                        currentCell,
                        steps: ctx.steps.concat(currentCell.id),
                        unvisitedsDirections: ctx.unvisitedsDirections.filter((cell) => cell.id !== currentCell.id),
                    };
                }),
            },
            guards: {
                isAutoRun: (ctx) => ctx.mode === "auto",
                hasReachedDeadEnd: (ctx) => !getNextStep(ctx),
                hasUnvisitedsDirections: (ctx) => Boolean(ctx.unvisitedsDirections.length),
                hasUnvisitedsBranchCells: (ctx) => Boolean(ctx.unvisitedsBranchCells.length),
                hasReachedAnotherBranchCell: (ctx) => ctx.branchCells.includes(getNextStep(ctx).id),
            },
        }
    );
};
export const getPathNeighbors = (cell: MazeCell) =>
    Object.values(cell.neighbors).filter((next) => next && next.state === "path");

export type MazePathFinderContext = ContextFrom<ReturnType<typeof createPathFinderMachine>>;

function getNextStep(ctx: {
    grid: MazeGridType;
    pathCells: MazeCell[];
    branchCells: string[];
    unvisitedsBranchCells: MazeCell[];
    rootBranchCell: MazeCell;
    unvisitedsDirections: MazeCell[];
    currentPaths: string[][];
    currentCell: MazeCell;
    steps: string[];
}) {
    if (!ctx.currentCell) console.log("oui");
    const steps = ctx.currentCell ? ctx.steps.concat(ctx.currentCell.id) : ctx.steps;
    const unvisitedsNeighbors = ctx.currentCell
        ? getPathNeighbors(ctx.currentCell).filter((cell) => !steps.includes(cell.id))
        : [];
    const currentCell = unvisitedsNeighbors[0];

    return currentCell;
}
