import { first, last } from "@pastable/core";
import { ContextFrom } from "xstate";
import { choose, raise } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";

import { getWentDirectionFromTo } from "./grid";
import { MazeCell, MazeGridType } from "./mazeGeneratorMachine";

export const createPathFinderMachine = ({ grid, stepDelayInMs }: { grid: MazeGridType; stepDelayInMs: number }) => {
    const paths = grid.flat().filter((cell) => cell.state === "path");
    const branchCells = paths.filter((cell) => getPathNeighbors(cell).length > 2);
    const firstBranch = branchCells[0];

    const model = createModel({
        mode: "manual" as "manual" | "auto",
        grid,
        pathCells: paths,
        /** Every cells that have more than 2 paths possible (=intersection) to go from */
        branchCells: branchCells.map((cell) => cell.id),
        unvisitedsBranchCells: branchCells.filter((cell) => cell.id !== firstBranch.id),
        rootBranchCell: firstBranch,
        unvisitedsDirections: getPathNeighbors(firstBranch),
        currentPaths: [] as Array<Array<MazeCell["id"]>>,
        currentCell: firstBranch,
        steps: [firstBranch.id] as Array<MazeCell["id"]>,
        /** Every closest other branchCells in each direction for each branchCells   */
        branchNodes: new Map(
            branchCells.map((cell) => [
                cell.id,
                {
                    left: undefined as MazeCell,
                    top: undefined as MazeCell,
                    right: undefined as MazeCell,
                    bottom: undefined as MazeCell,
                },
            ])
        ),
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
                            entry: ["addStepsToCurrentPaths"],
                            always: [
                                { target: "willChangeBranch", cond: "hasUnvisitedsDirections" },
                                { target: "willChangeRoot", cond: "hasUnvisitedsBranchCells" },
                                { target: "#finder.done" },
                            ],
                        },
                        willChangeRoot: { entry: "setRoot" },
                        willChangeBranch: {
                            entry: "setCurrentCell",
                            always: [
                                { target: "willChangePath", cond: "isCurrentCellAnotherBranchCell" },
                                { target: "pathing" },
                            ],
                        },
                    },
                    on: {
                        TOGGLE_MODE: { actions: ["toggleMode", raise("FINDER_STEP")] },
                        FINDER_STEP: [
                            { target: "finding.willChangePath", cond: "hasReachedDeadEnd" },
                            { target: "finding.willChangePath", cond: "hasReachedAnotherBranchCell" },
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
                setCurrentCell: model.assign((ctx) => {
                    const currentCell = ctx.unvisitedsDirections[0];
                    addBranchCellAsNodeDirectionNeighbor(ctx, currentCell);

                    return {
                        ...ctx,
                        currentCell,
                        steps: [ctx.rootBranchCell.id, currentCell.id], // only diff with step
                        unvisitedsDirections: ctx.unvisitedsDirections.filter((cell) => cell.id !== currentCell.id),
                    };
                }),
                addStepsToCurrentPaths: model.assign((ctx) => {
                    addBranchCellAsNodeDirectionNeighbor(ctx, getNextStep(ctx));
                    return {
                        ...ctx,
                        currentPaths: ctx.currentPaths.concat([ctx.steps]),
                        steps: [],
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
                isCurrentCellAnotherBranchCell: (ctx) => ctx.branchCells.includes(ctx.currentCell.id),
                hasReachedAnotherBranchCell: (ctx) => ctx.branchCells.includes(getNextStep(ctx)?.id),
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
    const steps = ctx.steps.concat(ctx.currentCell.id);
    const unvisitedsNeighbors = getPathNeighbors(ctx.currentCell).filter((cell) => !steps.includes(cell.id));
    const currentCell = unvisitedsNeighbors[0];

    return currentCell;
}

const addBranchCellAsNodeDirectionNeighbor = (ctx: MazePathFinderContext, nextCell: MazeCell) => {
    const firstStepId = ctx.steps[1] || nextCell.id;
    // We need to have moved at least once to figure out the direction taken from the rootBranchCell
    if (!firstStepId) return console.log(ctx, getNextStep(ctx));

    // Ignore dead-ends
    if (!ctx.branchCells.includes(nextCell?.id)) return;

    const firstStepAfterRootBranchCell = ctx.pathCells.find((cell) => cell.id === firstStepId);
    const wentDirection = getWentDirectionFromTo(ctx.rootBranchCell, firstStepAfterRootBranchCell);

    ctx.branchNodes.get(ctx.rootBranchCell.id)[wentDirection] = nextCell;
};
