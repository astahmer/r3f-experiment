import { last } from "@pastable/core";
import { ContextFrom } from "xstate";
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

    const vectorsMap = new Map(minimalVectors.map((vec) => [vec[3], vec]));
    const pointsState = new Map(minimalVectors.map((vec) => [vec[3], makePointStateFromVec(vec, ctx.branchNodes)]));

    return createModel({
        mode: "manual" as "manual" | "auto",
        stepDelayInMs,
        // inherited from pathFinder
        pathCells: ctx.pathCells,
        branchNodes: ctx.branchNodes,
        currentPaths: ctx.currentPaths,
        //
        currentVector: minimalVectors[0],
        nextVector: null as MazeVector,
        lastMergedVector: null as MazeVector,
        vectorsStartingById,
        pointsState,
        //
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
                done: {
                    entry: (ctx) => {
                        console.log("done pathMerger", ctx);
                        const longest = ctx.longestPaths[0];

                        ctx.pathCells.forEach((cell) => {
                            if (longest[0].includes(cell.id)) return (cell.display = "start");
                            if (longest[longest.length - 1].includes(cell.id)) return (cell.display = "end");
                            if (longest.includes(cell.id)) return (cell.display = "current");
                            cell.display = "path";
                        });
                    },
                },
            },
            on: {
                TOGGLE_MODE: { actions: ["toggleMode", raise("MERGER_STEP")] },
                MERGER_STEP: [
                    { target: "merging.willChangeNext", actions: "pickNext", cond: "hasUnvisitedsVectors" },
                    {
                        target: "merging.willChangeCurrent",
                        actions: ["removeVisitedPoints", "pickCurrent"],
                        cond: "shouldChangeCurrentVector",
                    },
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
                pickNext: model.assign((ctx) => {
                    const available = getAvailableVectorFor(
                        ctx.currentVector,
                        ctx.pointsState,
                        ctx.vectorsStartingById
                    );
                    const nextVector = available.vector;
                    const state = ctx.pointsState.get(ctx.currentVector[3]);

                    // console.log("pickNext", nextVector, ctx.currentVector);

                    // Update current vector point states
                    if (available.fromStart) {
                        state.startNodes = state.startNodes.filter((cell) => cell.id !== nextVector[1]);
                    } else {
                        state.endNodes = state.endNodes.filter((cell) => cell.id !== nextVector[1]);
                    }

                    return { ...ctx, nextVector };
                }),
                removeVisitedPoints: (ctx) => {
                    // Clear fully visiteds nodes
                    [...ctx.pointsState.entries()]
                        .filter(([_id, state]) => !(state.startNodes.length && state.endNodes.length))
                        .forEach(([id]) => ctx.pointsState.delete(id));
                },
                pickCurrent: model.assign((ctx) => {
                    let currentVector: MazeVector;

                    // Try to quickly recover using an unvisited node from the last merged
                    const lastMergedState = ctx.pointsState.get(ctx.lastMergedVector[3]);
                    if (lastMergedState && (lastMergedState.startNodes.length || lastMergedState.endNodes.length)) {
                        currentVector = ctx.lastMergedVector;
                    }

                    // Or either try to find a connection (unvisited direction) to the most recent (longest) path
                    // or finally fallback to the first available (has at least one unvisited direction in start/end nodes)
                    if (!currentVector) {
                        const availables = [...ctx.pointsState.entries()].filter(
                            ([_id, state]) => state.startNodes.length || state.endNodes.length
                        );
                        const fromCurrent = availables.filter(
                            ([_id, state]) => state.start === ctx.lastMergedVector[1]
                        );
                        const longestPathSize = Math.max(
                            ...fromCurrent.map(([_id, state]) => state.steps).map((path) => path.length)
                        );
                        const longestFromCurrent = fromCurrent.find(
                            ([_id, state]) => state.steps.length === longestPathSize
                        );

                        const entry = longestFromCurrent || availables[0];
                        currentVector = ctx.vectorsMap.get(entry[0]);
                    }

                    // console.log("pickCurrent", currentVector);

                    return { ...ctx, currentVector };
                }),
                merge: model.assign((ctx) => {
                    const mergedVector = mergeVector(ctx.currentVector, ctx.nextVector);

                    ctx.vectorsMap.set(mergedVector[3], mergedVector);
                    ctx.pointsState.set(mergedVector[3], makePointStateFromVec(mergedVector, ctx.branchNodes));

                    addVectorToStartingByIdMap(mergedVector, ctx.vectorsStartingById);

                    // console.log("merge", { mergedVector, hash: mergedVector[3], vectors: ctx.vectors });

                    return {
                        ...ctx,
                        lastMergedVector: ctx.currentVector,
                        currentVector: mergedVector,
                    };
                }),
                computeFullPaths: model.assign((ctx) => {
                    const nodesMap = ctx.branchNodes;

                    const interBranchPaths: Array<MazeCell["id"][]> = [...ctx.vectorsMap.values()].map((vec) => vec[2]);
                    const branchCellIds = [...ctx.branchNodes.keys()];

                    const subPathsByBranches: Record<MazeCell["id"], Array<MazeCell["id"][]>> = branchCellIds.reduce(
                        (acc, branchId) => ({
                            ...acc,
                            [branchId]: ctx.currentPaths.filter((path) => path[0] === branchId),
                        }),
                        {}
                    );

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

                        return (prependedPath ? prependedPath : []).concat(steps, appendedPath ? appendedPath : []);
                    });

                    const longestPathSize = Math.max(...fullPaths.map((path) => path.length));
                    const longestPaths = fullPaths.filter((path) => path.length === longestPathSize);
                    console.log(longestPaths);

                    return { ...ctx, longestPaths };
                }),
            },
            guards: {
                isAutoRun: (ctx) => ctx.mode === "auto",
                hasUnvisitedsVectors: (ctx) =>
                    Boolean(getAvailableVectorFor(ctx.currentVector, ctx.pointsState, ctx.vectorsStartingById).vector),
                shouldChangeCurrentVector: (ctx) => hasAnyMergeableNodes(ctx.pointsState),
                canMerge: (ctx) =>
                    ctx.currentVector &&
                    ctx.nextVector &&
                    !ctx.vectorsMap.has(mergeVector(ctx.currentVector, ctx.nextVector)[3]),
            },
        }
    );
};

const hasMergeableNodes = (state: ReturnType<typeof makePointStateFromVec>) =>
    state.startNodes.length || state.endNodes.length;
const hasAnyMergeableNodes = (points: MazePathMergerContext["pointsState"]) =>
    [...points.values()].some(hasMergeableNodes);

type CreatePathMergerMachineProps = Pick<MazePathFinderContext, "pathCells" | "branchNodes" | "currentPaths"> & {
    stepDelayInMs: number;
};
type MazeVector = [start: MazeCell["id"], end: MazeCell["id"], steps: Array<MazeCell["id"]>, hash: string];

// TODO leva controls
const getVectorHash = (from: MazeCell["id"], to: MazeCell["id"], steps: Array<MazeCell["id"]>) =>
    // [from, to].join(":") + "---" + steps.slice(1, -1).sort().join(":"); // A vector can be used multiple times as long as it never use the same in between steps
    // [from, to].join(":") + "---" + steps.length; // A vector can be used multiple times as long as the weight is different to do from/to
    [from, to].sort().join(":"); // A vector can only be used once

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

    return [start, end, steps, getVectorHash(start, end, steps)];
};

const addVectorToStartingByIdMap = (vec: MazeVector, map: Map<string, Array<MazeVector>>) => {
    const [start, end] = vec;
    const startingBy = map.get(start) || [];
    const endingBy = map.get(end) || [];

    startingBy.push(vec);
    endingBy.push(vec);

    if (!map.has(start)) map.set(start, startingBy);
    if (!map.has(end)) map.set(end, endingBy);
};

export type MazePathMergerContext = ContextFrom<ReturnType<typeof createPathMergerModel>>;

const getAvailableVectorFor = (
    vec: MazeVector,
    pointsState: MazePathMergerContext["pointsState"],
    vectorsStartingById: MazePathMergerContext["vectorsStartingById"]
) => {
    const state = pointsState.get(vec[3]);
    if (!state) return { fromStart: false, vector: null };

    // Find vectors starting by vec.start with an ending step contained in vec.startNodes
    // & with steps not intersecting with vec
    const fromStart = state.startNodes.map((node) =>
        vectorsStartingById
            .get(state.start)
            .find(
                (startingBy) =>
                    startingBy[1] === node.id &&
                    !state.steps.slice(1).some((step) => startingBy[2].slice(1).includes(step))
            )
    );
    if (fromStart.length) return { fromStart: true, vector: fromStart[0] };

    // Find vectors starting by vec.end with an ending step contained in vec.endNodes
    // & with steps not intersecting with vec
    const fromEnd = state.endNodes.map((node) =>
        vectorsStartingById
            .get(state.end)
            .find(
                (endingBy) =>
                    endingBy[1] === node.id &&
                    !state.steps.slice(0, -1).some((step) => endingBy[2].slice(0, -1).includes(step))
            )
    );

    return fromEnd.length ? { fromStart: false, vector: fromEnd[0] } : { fromStart: false, vector: null };
};

function makePointStateFromVec(
    vec: MazeVector,
    branchNodes: MazePathFinderContext["branchNodes"]
): { steps: string[]; start: string; startNodes: MazeCell[]; end: string; endNodes: MazeCell[] } {
    return {
        steps: vec[2],
        start: vec[0],
        startNodes: Object.values(branchNodes.get(vec[0])).filter((cell) => cell && !vec[2].includes(cell.id)),
        end: vec[1],
        endNodes: Object.values(branchNodes.get(vec[1])).filter((cell) => cell && !vec[2].includes(cell.id)),
    };
}
