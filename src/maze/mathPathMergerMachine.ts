import { last, pickOne } from "@pastable/core";
import { send } from "xstate";
import { raise } from "xstate/lib/actions";
import { createModel } from "xstate/lib/model";

import { MazeCell } from "./mazeGeneratorMachine";
import { MazePathFinderContext } from "./mazePathFinderMachine";

const createPathMergerModel = ({ stepDelayInMs, ...ctx }: CreatePathMergerMachineProps) => {
    const branchCellIds = [...ctx.branchNodes.keys()];
    const baseVectors = branchCellIds
        .map((branchId) =>
            Object.entries(ctx.branchNodes.get(branchId))
                .filter(([_dir, cell]) => cell)
                .map(([_dir, cell]) => {
                    const vector = [branchId, cell.id] as [string, string];
                    const steps =
                        ctx.currentPaths.find((path) => branchId === path[0] && cell.id === path[path.length - 1]) ||
                        vector;

                    const hashed = getVectorHash(branchId, cell.id, steps);

                    return [branchId, cell.id, steps, hashed];
                })
        )
        .flat() as Array<MazeVector>;

    const minimalVectors = [] as Array<MazeVector>;
    const minimalVectorsHash = new Set();
    const vectorsStartingById = new Map<string, Array<MazeVector>>();

    baseVectors.forEach((vec) => {
        addVectorToStartingByIdMap(vec, vectorsStartingById);
        if (!minimalVectorsHash.has(vec[3])) {
            minimalVectors.push(vec);
            minimalVectorsHash.add(vec[3]);
        }
    });

    // console.log({ currentPaths: ctx.currentPaths, baseVectors, minimalVectors });

    const vectorsMap = new Map(minimalVectors.map((vec) => [vec[3], vec[2]]));
    const vectors = [...minimalVectors];

    const currentVector = vectors[0];
    const unvisitedVectors = [
        ...vectorsStartingById.get(currentVector[0]),
        ...vectorsStartingById.get(currentVector[1]),
    ];
    const uniques = getUniquesVector(unvisitedVectors).filter((vec) => vec[3] !== currentVector[3]);
    console.log(unvisitedVectors, uniques);

    return createModel({
        mode: "manual" as "manual" | "auto",
        stepDelayInMs,
        // inherited from pathFinder
        pathCells: ctx.pathCells,
        branchNodes: ctx.branchNodes,
        currentPaths: ctx.currentPaths,
        //
        vectors,
        currentVector,
        nextVector: null as MazeVector,
        lastMergedVector: null as MazeVector,
        unvisitedVectors: uniques,
        vectorsStartingById,
        // unvisitedIterator: unvisitedVectors.values(),
        finalVectors: new Set(),
        //
        minimalVectors,
        vectorsMap,
        longestPaths: [] as Array<MazeCell["id"][]>,
    });
};

export const createPathMergerMachine = (ctx: CreatePathMergerMachineProps) => {
    const model = createPathMergerModel(ctx);

    return model.createMachine(
        {
            id: "pathMerger",
            initial: "merging",
            states: {
                merging: {
                    initial: "picking",
                    entry: ["drawGrid"],
                    after: { [ctx.stepDelayInMs]: { actions: raise("MERGER_STEP"), cond: "isAutoRun" } },
                    states: {
                        picking: {},
                        willChangeNext: { always: { target: "picking", actions: "merge", cond: "canMerge" } },
                        willChangeCurrent: {},
                        hasAllVectors: { always: { target: "#pathMerger.done", actions: "computeFullPaths" } },
                    },
                },
                done: { entry: (ctx) => console.log("done pathMerger", ctx) },
            },
            on: {
                TOGGLE_MODE: { actions: ["toggleMode", raise("MERGER_STEP")] },
                MERGER_STEP: [
                    { target: "merging.willChangeNext", actions: "pickNext", cond: "hasUnvisitedsVectors" },
                    { target: "merging.willChangeCurrent", actions: "pickCurrent", cond: "shouldChangeCurrentVector" },
                    { target: "merging.hasAllVectors" },
                ],
            },
        },
        {
            actions: {
                toggleMode: model.assign({ mode: (ctx) => (ctx.mode === "auto" ? "manual" : "auto") }),
                drawGrid: (ctx) => {
                    const currentSteps = ctx.currentVector?.[2] || [];
                    const nextSteps = ctx.nextVector?.[2] || [];

                    ctx.pathCells.forEach((cell) => {
                        if (currentSteps.includes(cell.id) && nextSteps.includes(cell.id))
                            return (cell.display = "start");
                        if (currentSteps.includes(cell.id)) return (cell.display = "blocked");
                        if (nextSteps.includes(cell.id)) return (cell.display = "current");
                        cell.display = "path";
                    });
                },
                pickNext: model.assign({
                    nextVector: (ctx) => {
                        const picked = ctx.unvisitedVectors.pop();
                        console.log("pickNext", picked);
                        return picked;
                    },
                }),
                pickCurrent: model.assign((ctx) => {
                    ctx.finalVectors.add(ctx.currentVector);
                    // const currentVector = ctx.finalVectors.has(ctx.lastMergedVector)
                    //     ? pickOne(ctx.vectors.filter((vec) => !ctx.finalVectors.has(vec)))
                    //     : ctx.lastMergedVector;
                    const currentVector = pickOne(ctx.vectors.filter((vec) => !ctx.finalVectors.has(vec)));
                    // const unvisitedVectors = [...ctx.vectors]; // TODO get from vectorsStartingById

                    const unvisitedVectors = [
                        ...ctx.vectorsStartingById.get(currentVector[0]),
                        ...ctx.vectorsStartingById.get(currentVector[1]),
                    ];
                    const uniques = getUniquesVector(unvisitedVectors).filter(
                        (vec) => vec[3] !== currentVector[3] && !ctx.finalVectors.has(vec)
                    );

                    console.log("pickCurrent", currentVector, uniques, unvisitedVectors);

                    return { ...ctx, currentVector, unvisitedVectors: uniques };
                }),
                merge: model.assign((ctx) => {
                    const mergedVector = mergeVector(ctx.currentVector, ctx.nextVector);

                    ctx.vectorsMap.set(mergedVector[3], mergedVector[2]);
                    addVectorToStartingByIdMap(mergedVector, ctx.vectorsStartingById);
                    // TODO add mergedVector to vectorsStartingById with mergedVector.start/end

                    console.log("merge", { mergedVector, hash: mergedVector[3], vectors: ctx.vectors });

                    return {
                        ...ctx,
                        lastMergedVector: mergedVector,
                        vectors: ctx.vectors
                            .filter((vec) => ![ctx.currentVector[3], ctx.nextVector[3]].includes(vec[3]))
                            .concat([mergedVector]),
                    };
                }),
                computeFullPaths: model.assign((ctx) => {
                    const nodesMap = ctx.branchNodes;

                    const interBranchPaths: Array<MazeCell["id"][]> = [...ctx.vectorsMap.values()];
                    const branchCellIds = [...ctx.branchNodes.keys()];

                    const subPathsByBranches: Record<MazeCell["id"], Array<MazeCell["id"][]>> = branchCellIds.reduce(
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

                        const longestPrependedPath = Math.max(...possiblePreprendedPaths.map((path) => path.length));
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
                        const appendedPath = possibleAppendedPaths.find((path) => path.length === longestAppendedPath);

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

                    return { ...ctx, longestPaths };
                }),
            },
            guards: {
                isAutoRun: (ctx) => ctx.mode === "auto",
                hasUnvisitedsVectors: (ctx) => Boolean(ctx.unvisitedVectors.length),
                shouldChangeCurrentVector: (ctx) => ctx.vectors.some((vec) => !ctx.finalVectors.has(vec)),
                canMerge: (ctx) => canMerge(ctx.currentVector, ctx.nextVector, ctx.vectorsMap),
            },
        }
    );
};

type CreatePathMergerMachineProps = Pick<MazePathFinderContext, "pathCells" | "branchNodes" | "currentPaths"> & {
    stepDelayInMs: number;
};
type MazeVector = [start: MazeCell["id"], end: MazeCell["id"], steps: Array<MazeCell["id"]>, hash: string];

const getVectorHash = (from: MazeCell["id"], to: MazeCell["id"], steps: Array<MazeCell["id"]>) =>
    getOrderedSteps(from, to, steps).join(",");

const getOrderedSteps = (from: MazeCell["id"], to: MazeCell["id"], steps: Array<MazeCell["id"]>) => {
    const [fromX, fromY] = from.split("/");
    const [toX, toY] = to.split("/");

    if (fromX === toX) {
        if (fromY < toY) return steps;
        return [...steps].reverse();
    }

    if (fromX < toX) return steps;
    return [...steps].reverse();
};

// const serializeVector = (vec: MazeVector) => vec.slice(0, 2).join(",");
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
    const [aStart, aEnd, aSteps] = aaa;
    const [bStart, bEnd, bSteps] = bbb;

    const [start, end] = [aStart, aEnd].concat([bStart, bEnd]).filter((step) => step !== common);

    const orderedStart = start === aStart ? aSteps.slice(0, -1) : [...aSteps].reverse().slice(0, -1);
    const orderedEnd = common === bStart ? bSteps : [...bSteps].reverse();

    const steps = orderedStart.concat(orderedEnd);

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

    return [start, end, steps, getVectorHash(start, end, steps)];
};
const isSameVector = (aaa: MazeVector, bbb: MazeVector) => aaa[3] === bbb[3];

const canMerge = (current: MazeVector, next: MazeVector, vectorsMap: Map<string, string[]>) => {
    if (!(current && next)) {
        // console.log("incomplete", { current, next });
        return false;
    }
    if (!hasCommonStep(current, next)) {
        // console.log("has no common step", { current, next });
        return false;
    }
    if (isSameVector(current, next)) {
        // console.log("is same", { current, next });
        return false;
    } // cant have the same from/to/cost (TODO check steps ?)

    const mergedVector = mergeVector(current, next);
    // console.log(mergedVector, current, next);
    if (mergedVector[0] === mergedVector[1]) {
        // console.log("not a valid vector", { current, next, mergedVector });
        return false;
    } // cant merge with self

    // console.log(mergedVector, current, next);
    if (mergedVector.filter(Boolean).length !== 4) {
        // console.log("should never happen", { current, next, mergedVector });
        return false;
    } // something went wrong ?

    if (mergedVector[2].length !== new Set(mergedVector[2]).size) {
        // console.log("went twice on same cell", { current, next, mergedVector });
        return;
    } // went twice on the same cell
    // console.log(
    //     {
    //         isOk: !vectorsMap.has(mergedVectorSerialized),
    //         mergedVector,
    //         current,
    //         next,
    //         mergedVectorSerialized,
    //     },
    //     vectorsMap
    // );
    const alreadyMerged = vectorsMap.has(mergedVector[3]);
    if (alreadyMerged) {
        // console.log("alreadyMerged", { current, next, mergedVector, vectorsMap });
        return false;
    }

    return true;
};

const addVectorToStartingByIdMap = (vec: MazeVector, map: Map<string, Array<MazeVector>>) => {
    const [start, end, steps] = vec;
    const startingBy = map.get(start) || [];
    const endingBy = map.get(end) || [];

    startingBy.push(vec);
    endingBy.push(vec);
    // console.log({ start, end, vec });

    if (!map.has(start)) map.set(start, startingBy);
    if (!map.has(end)) map.set(end, endingBy);
};

const getUniquesVector = (vectors: MazeVector[]) =>
    vectors.reduce((acc, item) => (acc.find((current) => current[3] === item[3]) ? acc : acc.concat([item])), []);
