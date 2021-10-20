import { first, last } from "@pastable/core";
import { ContextFrom } from "xstate";
import { choose, raise } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";

import { Direction, getWentDirectionFromTo } from "./grid";
import { MazeCell, MazeGridType } from "./mazeGeneratorMachine";

export const createPathFinderMachine = ({ grid, stepDelayInMs }: { grid: MazeGridType; stepDelayInMs: number }) => {
    const paths = grid.flat().filter((cell) => cell.state === "path");
    const branchCells = paths.filter((cell) => getPathNeighbors(cell).length > 2);
    const firstBranch = branchCells[0];

    const model = createModel({
        mode: "manual" as "manual" | "auto",
        grid,
        pathCells: paths,
        pathCellsMap: Object.fromEntries(paths.map((cell) => [cell.id, cell])),
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

                        // TODO compute all minimal vectors [branchCell A -> branchCell B]
                        // and then just fucking bruteforce make all possible combinations with that ?

                        const branchCellIds = ctx.branchCells;
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
                        // const branchNeighborNodesId = [...ctx.branchNeighborNodes.keys()];
                        // branchNeighborNodesId.forEach(
                        //     (branchId) =>
                        //         (subPathsByBranches[branchId] = ctx.currentPaths
                        //             .filter((path) => path[1] === branchId)
                        //             .map((path) => path.slice(1)))
                        // );

                        console.log("subPathsByBranches", subPathsByBranches);
                        // return;

                        const completeNodePaths: Array<MazeBranchSteps> = [];
                        // const nodesMap = new Map([...ctx.branchNodes.entries(), ...ctx.branchNeighborNodes.entries()]);
                        const nodesMap = new Map([...ctx.branchNodes.entries()]);
                        console.log("nodesMap", nodesMap);

                        let currentCellId = branchCellIds[0];
                        let unvisitedsBranchCells = branchCellIds
                            // .concat(branchNeighborNodesId)
                            .filter((cellId) => cellId !== currentCellId);
                        let nodePath = [["root", ctx.pathCellsMap[currentCellId]]] as MazeBranchSteps,
                            unvisitedsNeighborDirections: MazeBranchSteps = [];
                        let nextCell: MazeCell, direction: MazeBranchDirection;

                        let count = 0;

                        // Visit each branchCell exactly once
                        // Try to go as far as possible using branchNodes (closest neighbors)
                        // before taking the next branchCells from the unvisiteds ones
                        while (unvisitedsBranchCells.length) {
                            count++;
                            if (count > 500) break;

                            unvisitedsNeighborDirections = (
                                Object.entries(nodesMap.get(currentCellId)) as Array<[Direction, MazeCell]>
                            ).filter(([_dir, cell]) => cell && unvisitedsBranchCells.includes(cell.id));

                            // No more branchNodes, switch to the next unvisited branchCell
                            if (!unvisitedsNeighborDirections.length) {
                                if (!unvisitedsBranchCells.length) break;

                                currentCellId = unvisitedsBranchCells[0];
                                unvisitedsBranchCells = unvisitedsBranchCells.filter(
                                    (cellId) => cellId !== currentCellId
                                );
                                // console.log({ currentCellId }, unvisitedsBranchCells);

                                completeNodePaths.push(nodePath);

                                // Reset current path from that branchCell
                                nodePath = [["root", ctx.pathCellsMap[currentCellId]]];
                                continue;
                            }

                            // Take the first unvisited available direction from that branchCell
                            // const costs = Object.entries(ctx.branchNodesCost.get(currentCellId))
                            //     .filter(
                            //         ([dir, cost]) =>
                            //             cost &&
                            //             unvisitedsNeighborDirections.find(([neighborDir]) => neighborDir === dir)
                            //     )
                            //     .map(([dir, cost]) => cost);
                            // const maxCost = Math.max(...costs);
                            // console.log(
                            //     unvisitedsNeighborDirections,
                            //     ctx.branchNodesCost.get(currentCellId),
                            //     costs,
                            //     maxCost
                            // );
                            // [direction, nextCell] = unvisitedsNeighborDirections.find(
                            //     ([dir]) => ctx.branchNodesCost.get(currentCellId)[dir] === maxCost
                            // );
                            [direction, nextCell] = unvisitedsNeighborDirections[0];
                            // console.log(
                            //     unvisitedsNeighborDirections,
                            //     direction,
                            //     nextCell,
                            //     currentCellId,
                            //     nodesMap.get(currentCellId),
                            //     ctx.branchNodesCost.get(currentCellId)
                            // );
                            nodePath.push([direction, nextCell]);

                            // Loop again from there
                            unvisitedsBranchCells = unvisitedsBranchCells.filter((cellId) => cellId !== nextCell.id);
                            currentCellId = nextCell.id;
                            // console.log({ currentCellId, nextCell }, nodePath);
                        }
                        if (nodePath.length) completeNodePaths.push(nodePath);

                        // This computes all possible vectors between branchCells in the end
                        // By merging vectors that are not `final` (= paths that have both start & end branchCell step as visiteds )
                        // And repeating that step, excluding final vectors
                        // Until there remains no vectors with unvisiteds start or end branchCell step

                        console.log("completeNodePaths", completeNodePaths.flat());
                        const vectors: Array<MazeBranchVector> = completeNodePaths
                            .map((path) => path.map(([dir, cell]) => cell.id))
                            .map((path) => getAllPathsFromSteps(path))
                            .map((paths) =>
                                paths.map((steps: string[]) => {
                                    const start = first(steps);
                                    const end = last(steps);
                                    const vector = [start, end].sort().join(":");
                                    const shouldReverse = vector !== [start, end].join(":");
                                    const orderedSteps = shouldReverse ? [...steps].reverse() : steps;

                                    return {
                                        id: orderedSteps.join(","),
                                        vector,
                                        start,
                                        end,
                                        steps: orderedSteps,
                                        inBetween: orderedSteps.slice(1, -1),
                                    } as MazeBranchVector;
                                })
                            )
                            .flat();
                        console.log("vectors", vectors);

                        const availableVectors = [...vectors];
                        let computedVectors = [];

                        let currentVector = vectors[0];
                        let unvisitedsVectors = vectors.filter((vec) => vec.id !== currentVector.id);
                        let nextVector: MazeBranchVector, mergedVector: MazeBranchVector;

                        let commonStep: string;
                        let start: string;
                        let end: string;

                        let safe = 0;
                        let loop = 0;
                        console.log("unvisitedsVectors", unvisitedsVectors);
                        let isDone = false;

                        while (!isDone) {
                            if (++safe > 200) break;

                            nextVector = unvisitedsVectors.find(
                                (next) =>
                                    currentVector.id !== next.id &&
                                    (next.start === currentVector.start ||
                                        next.start === currentVector.end ||
                                        next.end === currentVector.start ||
                                        next.end === currentVector.end) &&
                                    !currentVector.steps.some((step) => next.inBetween.includes(step))
                            );
                            console.log(currentVector, nextVector, currentVector.id, unvisitedsVectors);
                            // console.log(currentVector.vector, { currentVector, nextVector, unvisitedsVectors });
                            if (!nextVector) {
                                // TODO reset unvisitedsVectors
                                if (!unvisitedsVectors.length) {
                                    loop++;
                                    console.log({ safe, loop });
                                    safe = 0;
                                    unvisitedsVectors = [...availableVectors];
                                    console.log(computedVectors);
                                    // if (!computedVectors.length) {
                                    //     isDone = true;
                                    // }
                                    computedVectors = [];
                                    console.log(unvisitedsVectors);

                                    if (loop > 20) {
                                        break;
                                    }
                                }

                                currentVector = unvisitedsVectors[0];
                                unvisitedsVectors = unvisitedsVectors.filter((vec) => vec.id !== currentVector.id);
                                console.log(currentVector, unvisitedsVectors);

                                continue;
                            }

                            unvisitedsVectors = unvisitedsVectors.filter(
                                (vec) => vec.id !== currentVector.id && vec.id !== nextVector.id
                            );

                            commonStep =
                                currentVector.start === nextVector.start || currentVector.start === nextVector.end
                                    ? currentVector.start
                                    : currentVector.end;
                            [start, end] = [
                                [currentVector.start, currentVector.end].find((step) => step !== commonStep),
                                [nextVector.start, nextVector.end].find((step) => step !== commonStep),
                            ].sort();
                            // console.log({
                            //     currentId: currentVector.vector,
                            //     nextId: nextVector.vector,
                            //     future: [start, end].join(":"),
                            //     commonStep,
                            //     currentVector,
                            //     nextVector,
                            // });

                            // TODO concat with reverse if wrong order cause of sort
                            const orderedSteps =
                                currentVector.steps[0] === commonStep
                                    ? [...currentVector.steps].reverse()
                                    : currentVector.steps;
                            const nextSteps =
                                nextVector.steps[0] === commonStep
                                    ? nextVector.steps.slice(1)
                                    : [...nextVector.steps].reverse().slice(1);
                            const steps = orderedSteps.concat(nextSteps);

                            mergedVector = {
                                id: orderedSteps.concat(nextSteps).join(","),
                                vector: [start, end].join(":"),
                                start,
                                end,
                                steps: orderedSteps.concat(nextSteps),
                                inBetween: steps.slice(1, -1),
                            };

                            currentVector = mergedVector;
                            // unvisitedsVectors = unvisitedsVectors.filter((vec) => vec.id !== currentVector.id);

                            if (availableVectors.find((vec) => vec.id === mergedVector.id)) {
                                continue;
                            }

                            availableVectors.push(mergedVector);
                            unvisitedsVectors.push(mergedVector);
                            computedVectors.push(mergedVector);
                            // console.log({
                            //     orderedSteps,
                            //     nextSteps,
                            //     steps,
                            //     start,
                            //     end,
                            //     commonStep,
                            //     inBetween: steps.slice(1, -1),
                            //     mergedVector,
                            // });
                        }
                        console.log("availableVectors", availableVectors, { safe });
                        console.log("subPathsByBranches", subPathsByBranches);

                        const interBranchPaths = availableVectors.map((vec) =>
                            vec.steps
                                .map((step, index) =>
                                    subPathsByBranches[step].find(
                                        (subPath) => subPath.slice(-1)[0] === vec.steps[index + 1]
                                    )
                                )
                                .filter(Boolean)
                                .map((steps, index, arr) =>
                                    index > 0 && index !== arr.length - 1 ? steps.slice(0, -1) : steps
                                )
                                .flat()
                        );

                        console.log("interBranchPaths", interBranchPaths);
                        const fullPaths = interBranchPaths.map((steps, index) => {
                            if (!steps.length) return steps;
                            const withoutFirst = steps.slice(1);

                            // console.log(
                            //     steps,
                            //     index,
                            //     subPathsByBranches[steps[0]],
                            //     subPathsByBranches[last(steps)],
                            //     withoutFirst
                            // );

                            const possiblePreprendedPaths = subPathsByBranches[steps[0]]
                                .map((subPath) => subPath.slice(0, -1))
                                .filter((subPath) => subPath.every((step) => !withoutFirst.includes(step)));

                            const longestPrependedPath = Math.max(
                                ...possiblePreprendedPaths.map((path) => path.length)
                            );
                            const rawPrependedPath = possiblePreprendedPaths.find(
                                (path) => path.length === longestPrependedPath
                            );
                            const prependedPath = nodesMap.has(rawPrependedPath[0])
                                ? rawPrependedPath.slice(1)
                                : rawPrependedPath.reverse();

                            const possibleAppendedPaths = subPathsByBranches[last(steps)]
                                .map((subPath) => subPath.slice(1))
                                .filter((subPath) => subPath.every((step) => !withoutFirst.includes(step)));

                            const longestAppendedPath = Math.max(...possibleAppendedPaths.map((path) => path.length));
                            const appendedPath = possibleAppendedPaths.find(
                                (path) => path.length === longestAppendedPath
                            );

                            return (prependedPath ? prependedPath : []).concat(steps, appendedPath ? appendedPath : []);
                        });

                        const longestPathSize = Math.max(...fullPaths.map((path) => path.length));
                        const longestPaths = fullPaths.filter((path) => path.length === longestPathSize);

                        console.log("longestPaths", longestPaths, { interBranchPaths, fullPaths });
                        // console.log(completeNodePaths.map((path) => path.map(([dir, cell]) => `${dir}-${cell.id}`)));
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
                    if (wentDirection) {
                        ctx.branchNodesCost.get(ctx.rootBranchCell.id)[wentDirection] = pathCost;
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
                    if (wentDirection) {
                        ctx.branchNodesCost.get(ctx.rootBranchCell.id)[wentDirection] = pathCost;
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
    if (!firstStepId) return;

    // Ignore dead-ends
    if (!ctx.branchCells.includes(nextCell?.id)) return;

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

// TODO store cost + steps for each subPath

// TODO, from a branchCell, avoid going in directions already visited in reverse
// if we already did [3/2] --> [6/2], do not bother doing [6/2] --> [3/2]

// subPath = [currentCell.id, nextCell.id].sort()
// nodePath.push(subPath)

/**
 * Returns every possible sub-path for a given A->Z path
 * -> A->B, A->B-C, ... A->B->...->X->Y->Z
 * -> B->C, B->C->D, etc...
 *
 * Ex: getAllPathsFromSteps([1, 2, 3, 4, 5])
 * =
 * [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5]
 * [2, 3], [2, 3, 4], [2, 3, 4, 5]
 * [3, 4], [3, 4, 5]
 * [4, 5]
 */
function getAllPathsFromSteps(arr: Array<MazeCell["id"]>) {
    const paths = [];
    let i = 0;
    for (i; i < arr.length; i++) {
        let y = 1;
        let current = [arr[i]];
        for (y; y < arr.length - i; y++) {
            current.push(arr[i + y]);
            paths.push([...current]);
        }
    }

    return paths;
}

type MazeBranchDirection = Direction | "root";
type MazeBranchStep = [MazeBranchDirection, MazeCell];
type MazeBranchSteps = Array<MazeBranchStep>;

type MazeBranchVector = {
    id: string;
    vector: string;
    start: string;
    end: string;
    steps: string[];
    inBetween: string[];
};
