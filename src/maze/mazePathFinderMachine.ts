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
                visiting: {
                    initial: "moving",
                    entry: ["drawGrid"],
                    after: { [stepDelayInMs]: { actions: raise("FINDER_STEP"), cond: "isAutoRun" } },
                    states: {
                        moving: {},
                        willChangeStart: {},
                    },
                    on: {
                        TOGGLE_MODE: { actions: ["toggleMode", raise("FINDER_STEP")] },
                        FINDER_STEP: [
                            { target: ".willChangeStart", cond: "hasNoMoreUnvisitedDirectionAvailable" },
                            { target: ".moving", actions: "step" },
                        ],
                    },
                },
                merging: {
                    // initial: "",
                    states: {
                        adding: {},
                        // willChange
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
                        // return;

                        const completeNodePaths: Array<MazeBranchSteps> = [];
                        let currentCellId = ctx.branchCells[0];
                        let unvisitedsBranchCells = ctx.branchCells.filter((cellId) => cellId !== currentCellId);
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
                                Object.entries(ctx.branchNodes.get(currentCellId)) as Array<[Direction, MazeCell]>
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
                            [direction, nextCell] = unvisitedsNeighborDirections[0];
                            nodePath.push([direction, nextCell]);

                            // Loop again from there
                            unvisitedsBranchCells = unvisitedsBranchCells.filter((cellId) => cellId !== nextCell.id);
                            currentCellId = nextCell.id;
                            // console.log({ currentCellId, nextCell }, nodePath);
                        }
                        if (nodePath.length) completeNodePaths.push(nodePath);

                        // This computes all possible paths in the end
                        // By merging paths that are not `final` (= paths that have both start & end branchCell step as visiteds )
                        // And repeating that step, excluding final paths
                        // Until there remains no paths with unvisiteds start or end branchCell step

                        console.log(completeNodePaths, completeNodePaths.flat());
                        const stepsByVectors: Record<string, MazeBranchVector> = Object.fromEntries(
                            completeNodePaths
                                .map((path) => path.map(([dir, cell]) => cell.id))
                                .map((path) => getAllPathsFromSteps(path))
                                .map((paths) =>
                                    paths.map((steps) => {
                                        const start = first(steps);
                                        const end = last(steps);
                                        const id = [start, end].sort().join(":");
                                        const shouldReverse = id !== [start, end].join(":");
                                        const orderedSteps = shouldReverse ? [...steps].reverse() : steps;

                                        return [
                                            id,
                                            { start, end, steps: orderedSteps, inBetween: orderedSteps.slice(1, -1) },
                                        ];
                                    })
                                )
                                .flat()
                        );

                        // const steps
                        const availableVectors = new Map(Object.entries(stepsByVectors));
                        const vectorIds = Object.keys(stepsByVectors);

                        let currentVectorId = vectorIds[0];
                        let currentVector: MazeBranchVector;
                        let unvisitedsVectorIds = vectorIds.filter((id) => id !== currentVectorId);

                        let nextVectorId: string;
                        let nextVector: MazeBranchVector;
                        let commonStep: string;
                        let start: string;
                        let end: string;
                        // let mergedVectorId: string

                        // current: 2/12:3/5
                        // unvisiteds =  [xxx, yyy, 3/5:4/8]
                        // unvisiteds =  [xxx, yyy, 4/8:3/5]
                        let safe = 0;
                        console.log([...unvisitedsVectorIds]);
                        console.log(stepsByVectors);

                        while (unvisitedsVectorIds.length) {
                            if (++safe > 200) break;

                            currentVector = availableVectors.get(currentVectorId);
                            nextVectorId = unvisitedsVectorIds.find(
                                (id) =>
                                    id !== currentVectorId &&
                                    (id.startsWith(currentVector.start) ||
                                        id.startsWith(currentVector.end) ||
                                        id.endsWith(currentVector.start) ||
                                        id.endsWith(currentVector.end)) &&
                                    !currentVector.steps.some((step) =>
                                        availableVectors.get(id).inBetween.includes(step)
                                    )
                            );
                            console.log(currentVectorId, { currentVector, nextVectorId, unvisitedsVectorIds });
                            if (!nextVectorId) {
                                if (!unvisitedsVectorIds.length) break;

                                currentVectorId = unvisitedsVectorIds[0];
                                unvisitedsVectorIds = unvisitedsVectorIds.filter((id) => id !== currentVectorId);

                                continue;
                            }

                            unvisitedsVectorIds = unvisitedsVectorIds.filter(
                                (id) => currentVectorId !== id && nextVectorId !== id
                            );
                            nextVector = availableVectors.get(nextVectorId);

                            // TODO rm since we already have unvisitedsVectorIds ?
                            // availableVectors.delete(nextVectorId)
                            // availableVectors.delete(currentVectorId)

                            commonStep =
                                currentVector.start === nextVector.start || currentVector.start === nextVector.end
                                    ? currentVector.start
                                    : currentVector.end;
                            [start, end] = [
                                [currentVector.start, currentVector.end].find((step) => step !== commonStep),
                                [nextVector.start, nextVector.end].find((step) => step !== commonStep),
                            ].sort();
                            console.log({
                                currentVectorId,
                                nextVectorId,
                                future: [start, end].join(":"),
                                commonStep,

                                currentVector,
                                nextVector,
                            });
                            currentVectorId = [start, end].join(":");

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
                            console.log({
                                orderedSteps,
                                nextSteps,
                                steps,
                                start,
                                end,
                                commonStep,
                                inBetween: steps.slice(1, -1),
                            });

                            availableVectors.set(currentVectorId, {
                                start,
                                end,
                                steps: orderedSteps.concat(nextSteps),
                                inBetween: steps.slice(1, -1),
                            });
                            unvisitedsVectorIds.push(currentVectorId);
                        }
                        console.log(availableVectors, { safe, unvisitedsVectorIds });
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
                    // TODO store cost
                    // console.log(
                    //     `[${ctx.rootBranchCell.id}] ---> [${last(steps)}] = ${steps.length - (nextCell ? 2 : 1)}`
                    // );

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
    if (!firstStepId) return console.log(ctx, getNextStep(ctx));

    // Ignore dead-ends
    if (!ctx.branchCells.includes(nextCell?.id)) return;

    const firstStepAfterRootBranchCell = ctx.pathCellsMap[firstStepId];
    const wentDirection = getWentDirectionFromTo(ctx.rootBranchCell, firstStepAfterRootBranchCell);

    if (!ctx.branchNodes.get(ctx.rootBranchCell.id)[wentDirection]) {
        ctx.branchNodes.get(ctx.rootBranchCell.id)[wentDirection] = nextCell;
    }
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

type MazeBranchVector = { start: string; end: string; steps: string[]; inBetween: string[] };
