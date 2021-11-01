import { ContextFrom } from "xstate";
import { raise } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";

import { getWentDirectionFromTo } from "./grid";
import { MazeCell, MazeGridType } from "./mazeGeneratorMachine";
import { createPathMergerMachine } from "./mazePathMergerMachine";

export const createPathFinderMachine = ({ grid, stepDelayInMs }: { grid: MazeGridType; stepDelayInMs: number }) => {
    const model = createPathFinderModel(grid);

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
                        console.log("done pathfinder", ctx);
                    },
                    invoke: {
                        id: "merger",
                        autoForward: true,
                        src: (ctx) => createPathMergerMachine({ ...ctx, stepDelayInMs }),
                    },
                },
            },
        },
        {
            actions: {
                toggleMode: model.assign({ mode: (ctx) => (ctx.mode === "auto" ? "manual" : "auto") }),
                drawGrid: (ctx) => {
                    ctx.steps.forEach((cellId) => (ctx.pathCellsMap[cellId].display = "mark"));
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
                        displayChanged: [rootBranchCell],
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
                    const nextCell = getNextStep(ctx);
                    addBranchCellAsNodeDirectionNeighbor(ctx, nextCell);

                    const steps = ctx.steps.concat(nextCell ? nextCell.id : []);

                    return {
                        ...ctx,
                        currentPaths: ctx.currentPaths.concat([steps]),
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
                isCurrentCellAnotherBranchCell: (ctx) => ctx.branchCellIds.includes(ctx.currentCell.id),
                hasReachedAnotherBranchCell: (ctx) => ctx.branchCellIds.includes(getNextStep(ctx)?.id),
            },
        }
    );
};
export const getPathNeighbors = (cell: MazeCell) =>
    Object.values(cell.neighbors).filter((next) => next && next.state === "path");

export type MazePathFinderContext = ContextFrom<ReturnType<typeof createPathFinderModel>>;

function createPathFinderModel(grid: MazeGridType) {
    const paths = grid.flat().filter((cell) => cell.state === "path");
    const branchCells = paths.filter((cell) => getPathNeighbors(cell).length > 2);
    const firstBranch = branchCells[0];

    const model = createModel(
        {
            mode: "manual" as "manual" | "auto",
            grid,
            pathCells: paths,
            pathCellsMap: Object.fromEntries(paths.map((cell) => [cell.id, cell])),
            /** Every cells that have more than 2 paths possible (=intersection) to go from */
            branchCellIds: branchCells.map((cell) => cell.id),
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
        },
        { events: { TOGGLE_MODE: noop, FINDER_STEP: noop } }
    );

    return model;
}
const noop = () => ({});

function getNextStep(ctx: MazePathFinderContext) {
    const steps = ctx.steps.concat(ctx.currentCell.id);
    const unvisitedsNeighbors = getPathNeighbors(ctx.currentCell).filter((cell) => !steps.includes(cell.id));
    const currentCell = unvisitedsNeighbors[0];

    return currentCell;
}

const addBranchCellAsNodeDirectionNeighbor = (ctx: MazePathFinderContext, nextCell: MazeCell) => {
    const firstStepId = ctx.steps[1] || nextCell.id;
    // We need to have moved at least once to figure out the direction taken from the rootBranchCell
    if (!firstStepId) return;

    // Ignore dead-ends
    if (!ctx.branchCellIds.includes(nextCell?.id)) return;

    const firstStepAfterRootBranchCell = ctx.pathCellsMap[firstStepId];
    const wentDirection = getWentDirectionFromTo(ctx.rootBranchCell, firstStepAfterRootBranchCell);

    if (!ctx.branchNodes.get(ctx.rootBranchCell.id)[wentDirection]) {
        ctx.branchNodes.get(ctx.rootBranchCell.id)[wentDirection] = nextCell;
    }
};
