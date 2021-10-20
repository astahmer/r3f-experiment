import { first, last } from "@pastable/core";
import { ContextFrom } from "xstate";
import { choose, raise } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";

import { Direction, getWentDirectionFromTo } from "./grid";
import { MazeCell, MazeGridType } from "./mazeGeneratorMachine";

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
                        console.log(ctx);

                        const start = new Date();

                        const branchCellIds = ctx.branchCellIds;
                        const nodesMap = new Map(ctx.branchNodes.entries());
                        const minimalVectors = branchCellIds
                            .map((branchId) =>
                                Object.entries(nodesMap.get(branchId))
                                    .filter(([_dir, cell]) => cell)
                                    .map(([dir, cell]) => {
                                        const steps = ctx.currentPaths.find(
                                            (path) => path[0] === branchId && last(path) === cell.id
                                        ) || [branchId, cell.id];

                                        return [
                                            branchId,
                                            cell.id,
                                            // ctx.branchNodesCost.get(branchId)[dir],
                                            steps.length,
                                            steps,
                                        ];
                                    })
                            )
                            .flat() as Array<MazeVector>;
                        console.log(minimalVectors);

                        type MazeVector = [MazeCell["id"], MazeCell["id"], number, Array<MazeCell["id"]>];
                        const vectors = [...minimalVectors];

                        const serializeVector = (vec: MazeVector) => vec.slice(0, 3).join(",");
                        // const deserializeVector = (serialized: string) => serialized.split(",");

                        const vectorsMap = new Map(
                            minimalVectors.map(
                                ([start, end, cost, steps]: MazeVector) =>
                                    [[start, end, cost].join(","), steps] as [string, Array<MazeCell["id"]>]
                            )
                        );
                        const mergedVectorsMap = new Map();

                        let currentVector: MazeVector = vectors[0];
                        let nextVector: MazeVector;
                        let mergedVector: MazeVector;
                        let mergedVectorSerialized: string;

                        const hasCommonStep = ([start, end]: MazeVector, [first, second]: MazeVector) =>
                            start === first || start === second || end === first || end === second;
                        const getCommonStep = ([start, end]: MazeVector, [first, second]: MazeVector) => {
                            if (start === first) return start;
                            if (start === second) return start;
                            if (end === first) return end;
                            if (end === second) return end;
                        };
                        const mergeVector = (aaa: MazeVector, bbb: MazeVector): MazeVector => {
                            const common = getCommonStep(aaa, bbb);
                            const [aStart, aEnd, _aCost, aSteps] = aaa;
                            const [bStart, bEnd, _bCost, bSteps] = bbb;

                            const [start, end] = [aStart, aEnd]
                                .concat([bStart, bEnd])
                                .filter((step) => step !== common);

                            const orderedStart =
                                start === aStart ? aSteps.slice(1) : [...aSteps].reverse().slice(0, -1);
                            const orderedEnd = common === bStart ? bSteps : [...bSteps].reverse();

                            const steps = orderedStart.concat(orderedEnd);
                            const cost = steps.length;

                            // console.log({
                            //     common,
                            //     start,
                            //     end,
                            //     steps,
                            //     inBetween,
                            //     oldinBetween,
                            //     aStart,
                            //     aEnd,
                            //     aSteps,
                            //     bStart,
                            //     bEnd,
                            //     bSteps,
                            // });

                            return [start, end, cost, steps];
                        };
                        const isSameVector = (aaa: MazeVector, bbb: MazeVector) =>
                            serializeVector(aaa) === serializeVector(bbb);

                        const canMerge = (next: MazeVector) => {
                            if (!hasCommonStep(currentVector, next)) return false;
                            if (isSameVector(currentVector, next)) return false; // cant have the same from/to/cost (TODO check steps ?)

                            mergedVector = mergeVector(currentVector, next);
                            // console.log(mergedVector, currentVector, next);
                            if (mergedVector[0] === mergedVector[1]) return false; // cant merge with self

                            // console.log(mergedVector, currentVector, next);
                            if (mergedVector.filter(Boolean).length !== 4) return false; // something went wrong ?

                            if (mergedVector[3].length !== new Set(mergedVector[3]).size) return; // went twice on the same cell

                            mergedVectorSerialized = serializeVector(mergedVector);
                            // console.log(
                            //     {
                            //         isOk: !vectorsMap.has(mergedVectorSerialized),
                            //         mergedVector,
                            //         currentVector,
                            //         next,
                            //         mergedVectorSerialized,
                            //     },
                            //     vectorsMap
                            // );
                            return !vectorsMap.has(mergedVectorSerialized);
                        };

                        let safe = 0;
                        checkNext: do {
                            nextVector = vectors.find(canMerge);

                            if (++safe > 12000) break; // safety
                            if (!nextVector) {
                                let i = 0;
                                for (i; i < vectors.length; i++) {
                                    currentVector = vectors[i];
                                    nextVector = vectors.find(canMerge);
                                    if (nextVector) continue checkNext;
                                }

                                break;
                            }

                            vectorsMap.set(mergedVectorSerialized, mergedVector[3]);
                            mergedVectorsMap.set(mergedVectorSerialized, mergedVector[3]);
                            vectors.push(mergedVector);
                        } while (nextVector);

                        console.log(vectorsMap, mergedVectorsMap, { safe });

                        const interBranchPaths: Array<MazeCell["id"][]> = [...vectorsMap.values()];

                        const subPathsByBranches: Record<
                            MazeCell["id"],
                            Array<MazeCell["id"][]>
                        > = branchCellIds.reduce(
                            (acc, branchId) => ({
                                ...acc,
                                [branchId]: ctx.currentPaths.filter((path) => path[0] === branchId),
                            }),
                            {}
                        );
                        console.log(subPathsByBranches);

                        const fullPaths = interBranchPaths.map((steps) => {
                            if (!steps.length) return steps;
                            const withoutFirst = steps.slice(1);

                            const possiblePreprendedPaths = subPathsByBranches[steps[0]]
                                .map((subPath) => subPath.slice(0, -1))
                                .filter((subPath) => subPath.every((step) => !withoutFirst.includes(step)));

                            const longestPrependedPath = Math.max(
                                ...possiblePreprendedPaths.map((path) => path.length)
                            );
                            const rawPrependedPath = possiblePreprendedPaths.find(
                                (path) => path.length === longestPrependedPath
                            );
                            const prependedPath = rawPrependedPath
                                ? nodesMap.has(rawPrependedPath[0])
                                    ? rawPrependedPath.slice(1).reverse()
                                    : [...rawPrependedPath].reverse()
                                : [];

                            const possibleAppendedPaths = subPathsByBranches[last(steps)]
                                .map((subPath) => subPath.slice(1))
                                .filter((subPath) => subPath.every((step) => !withoutFirst.includes(step)));

                            const longestAppendedPath = Math.max(...possibleAppendedPaths.map((path) => path.length));
                            const appendedPath = possibleAppendedPaths.find(
                                (path) => path.length === longestAppendedPath
                            );

                            // console.log({
                            //     finalSteps: (prependedPath ? prependedPath : []).concat(
                            //         steps,
                            //         appendedPath ? appendedPath : []
                            //     ),
                            //     steps,
                            //     possiblePreprendedPaths,
                            //     longestPrependedPath,
                            //     rawPrependedPath,
                            //     prependedPath,
                            //     possibleAppendedPaths,
                            //     longestAppendedPath,
                            //     appendedPath,
                            // });
                            return (prependedPath ? prependedPath : []).concat(steps, appendedPath ? appendedPath : []);
                        });

                        const longestPathSize = Math.max(...fullPaths.map((path) => path.length));
                        const longestPaths = fullPaths.filter((path) => path.length === longestPathSize);
                        console.log(interBranchPaths);
                        console.log(longestPaths);
                        console.log((new Date().getTime() - start.getTime()) / 1000);
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
                    const wentDirection = addBranchCellAsNodeDirectionNeighbor(ctx, currentCell);

                    const pathCost = ctx.steps.length - (currentCell ? 2 : 1);

                    // wentDirection === undefined means it's a dead-end, as in there is no branchCell there
                    if (wentDirection && !ctx.branchNodesCost.get(ctx.rootBranchCell.id)[wentDirection]) {
                        ctx.branchNodesCost.get(ctx.rootBranchCell.id)[wentDirection] = pathCost > 0 ? pathCost : 1;
                    }

                    return {
                        ...ctx,
                        currentCell,
                        steps: [ctx.rootBranchCell.id, currentCell.id], // only diff with step
                        unvisitedsDirections: ctx.unvisitedsDirections.filter((cell) => cell.id !== currentCell.id),
                    };
                }),
                addStepsToCurrentPaths: model.assign((ctx) => {
                    const nextCell = getNextStep(ctx);
                    const wentDirection = addBranchCellAsNodeDirectionNeighbor(ctx, nextCell);

                    const steps = ctx.steps.concat(nextCell ? nextCell.id : []);
                    const pathCost = steps.length - (nextCell ? 2 : 1);

                    // wentDirection === undefined means it's a dead-end, as in there is no branchCell there
                    if (wentDirection && !ctx.branchNodesCost.get(ctx.rootBranchCell.id)[wentDirection]) {
                        ctx.branchNodesCost.get(ctx.rootBranchCell.id)[wentDirection] = pathCost > 0 ? pathCost : 1;
                    }

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

    const model = createModel({
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
        branchNodesCost: new Map(
            branchCells.map((cell) => [
                cell.id,
                {
                    left: undefined as number,
                    top: undefined as number,
                    right: undefined as number,
                    bottom: undefined as number,
                },
            ])
        ),
        branchNeighborNodes: new Map(),
    });

    return model;
}

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
        if (!ctx.branchNeighborNodes.has(firstStepId))
            ctx.branchNeighborNodes.set(firstStepId, {
                left: undefined,
                top: undefined,
                right: undefined,
                bottom: undefined,
            });

        ctx.branchNeighborNodes.get(firstStepId)[wentDirection] = nextCell;
    }

    return wentDirection;
};
