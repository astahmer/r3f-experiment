import { last, pickOne } from "@pastable/utils";
import { assign, createMachine } from "xstate";

import { Direction, GridCell, getOppositeDirection, makeGrid } from "./grid";
import { createSolveMachine } from "./mazeSolverMachine";

/**
 * - Let C be a list of cells, initially empty. Add one a random cell from the maze to C.
 * - Choose a cell from C, and carve a passage to any unvisited neighbor of that cell, adding that neighbor to C as well.
 *   If there are no unvisited neighbors, remove the cell from C.
 * - Repeat step 2 until C is empty.
 */
export const createMazeMachine = ({
    width,
    height,
    stepDelayInMs = 100,
    randomChance = 0.5,
    projection = 0,
    mode = "both",
}: {
    width: number;
    height: number;
    stepDelayInMs?: number;
    randomChance?: number;
    projection?: number;
    mode?: MazePickMode;
}) => {
    const pickWallWithMode = (mode: MazePickMode, walls: MazeCell[]) => {
        if (mode === "both") return randomChance > Math.random() ? pickOne(walls) : last(walls);
        if (mode === "latest") return last(walls);
        if (mode === "random") return pickOne(walls);
    };
    const getInitialCtx = (width: number, height: number): MazeGeneratorContext => {
        const { grid, list, first, notABorderCell } = getInitialGrid(width, height);
        return {
            grid,
            list,
            walls: [first],
            mode,
            prevCell: null as MazeCell,
            notABorderCell,
        };
    };

    return createMachine(
        {
            initial: "incomplete",
            context: getInitialCtx(width + 1, height + 1),
            states: {
                incomplete: {
                    on: {
                        STEP: [{ target: "done", actions: "step", cond: "hasVisitedAllCells" }, { actions: "step" }],
                        RUN: { target: "running" },
                    },
                },
                running: {
                    after: {
                        [stepDelayInMs]: [
                            { target: "done", cond: "hasVisitedAllCells" },
                            { target: "running", actions: "step" },
                        ],
                    },
                    on: { PAUSE: { target: "incomplete" } },
                },
                done: {
                    entry: [() => console.log("done generating"), "openBorder"],
                    invoke: {
                        id: "solver",
                        autoForward: true,
                        src: (ctx) => createSolveMachine({ grid: ctx.grid, stepDelayInMs }),
                    },
                    on: { UPDATE_GRID: { actions: "updateGrid" } },
                },
            },
            on: {
                RESET: { target: "incomplete", actions: "reset" },
                MODE: { actions: "setMode" },
                IMPORT: { target: "done", actions: "import" },
            },
        },
        {
            actions: {
                setMode: assign((ctx, e) => ({ ...ctx, mode: (e as any).value })),
                import: assign((ctx, e) => {
                    const states = (e as any).states as Array<MazeCell["state"][]>;
                    if (!states?.length) return;

                    const updatedCtx = getInitialCtx(states[0].length, states.length);
                    const statesList = states
                        .slice(1, -1)
                        .map((row) => row.slice(1, -1))
                        .flat();

                    updatedCtx.grid
                        .slice(1, -1)
                        .map((row) => row.slice(1, -1))
                        .flat()
                        .forEach((v, i) => {
                            v.state = statesList[i];
                            v.display = statesList[i];
                            v.visited = true;
                        });

                    return { ...ctx, ...updatedCtx };
                }),
                reset: assign(() => getInitialCtx(width + 1, height + 1)),
                step: assign((ctx) => {
                    if (ctx.prevCell?.display === "current") {
                        ctx.prevCell.display = "path";
                    }

                    const walls = [...ctx.walls];
                    if (!walls.length) {
                        // If there are no more walls available (ran into a dead-end), start over from a random unvisited cell
                        const nextCell = pickOne(ctx.list.filter((cell) => !cell.visited));
                        if (!nextCell) return ctx;

                        walls.push(nextCell);
                    }

                    const prevCell = pickWallWithMode(ctx.mode, walls);
                    prevCell.visited = true;

                    const neighbors = Object.entries(prevCell.neighbors).filter(
                        ([dir, neighbor]) => neighbor && !neighbor.visited && ctx.notABorderCell(neighbor)
                    ) as Array<[Direction, MazeCell]>;

                    if (!neighbors.length) {
                        prevCell.display = "blocked";
                        prevCell.state = "path";
                        walls.splice(
                            walls.findIndex((cell) => cell.id === prevCell.id),
                            1
                        );
                        return { ...ctx, walls, prevCell };
                    }

                    const [direction, nextCell] = pickOne(neighbors);
                    const opposite = getOppositeDirection(direction);
                    neighbors
                        .filter(([dir, cell]) => cell.id !== prevCell.id && dir !== direction && dir !== opposite)
                        .forEach(([dir, rootNeighbor]) => {
                            if (neighbors.length > 1) {
                                rootNeighbor.visited = true;
                                rootNeighbor.display = "wall";
                                rootNeighbor.state = "wall";
                            }

                            let nesting = 1;
                            function makeFutureNeighborAWall(cell: MazeCell, nesting: number) {
                                const futureNeighbor = cell.neighbors[direction];
                                // if (getRandomFloatIn(0, 1) > randomChance ? futureNeighbor : false) {
                                if (!futureNeighbor) return;

                                if (futureNeighbor.state === "path") return;

                                // TODO chance
                                // futureNeighbor.visited = true;
                                // futureNeighbor.display = "wall";
                                // futureNeighbor.state = "wall";

                                if (nesting < projection) {
                                    const nextNeighbors = Object.entries(futureNeighbor.neighbors).filter(
                                        ([dir, next]) => next && dir === direction
                                    );
                                    nextNeighbors.forEach(([dir, next]) => {
                                        if (neighbors.length > 1) {
                                            next.visited = true;
                                            next.display = "wall";
                                            next.state = "wall";
                                        }
                                        makeFutureNeighborAWall(next, nesting + 1);
                                    });
                                }
                            }

                            projection && makeFutureNeighborAWall(rootNeighbor, nesting);
                        });

                    nextCell.visited = true;
                    nextCell.display = "current";
                    nextCell.state = "path";
                    walls.push(nextCell);

                    // TODO setting / chance ?
                    // prevCell.display = "start";
                    // walls.splice(
                    //     walls.findIndex((cell) => cell.id === prevCell.id),
                    //     1
                    // );

                    return { ...ctx, walls, prevCell };
                }),
                openBorder: assign((ctx) => {
                    return ctx;
                    const borders = ctx.grid
                        .flat()
                        .filter((cell) => !cell.x || !cell.y || cell.x === width || cell.y === height);
                    const linkedBorders = borders.filter((cell) =>
                        Object.values(cell.neighbors)
                            .filter(Boolean)
                            .some((cell) => cell.state === "path")
                    );

                    const start = pickOne(linkedBorders);
                    console.log(ctx, borders, linkedBorders, start);
                    start.display = "start";
                    start.state = "path";

                    const unlinkedBorders = borders.filter((cell) =>
                        Object.values(cell.neighbors)
                            .filter(Boolean)
                            .every((cell) => cell.state !== "path")
                    );
                    unlinkedBorders.forEach((cell) => {
                        cell.display = "wall";
                        cell.state = "wall";
                    });

                    linkedBorders
                        .filter((cell) => cell.id !== start.id)
                        .forEach((cell) => {
                            cell.display = "wall";
                            cell.state = "wall";
                        });

                    return { ...ctx };
                }),
                // @ts-ignore
                updateGrid: assign({ grid: (ctx, event) => event.value }),
            },
            guards: {
                hasVisitedAllCells: (ctx) => ctx.list.every((cell) => cell.visited),
            },
        }
    );
};

interface MazeGeneratorContext {
    grid: MazeGridType;
    list: MazeCell[];
    walls: MazeCell[];
    mode: MazePickMode;
    prevCell: MazeCell;
    notABorderCell: (cell: MazeCell) => boolean;
}

export type MazeGridType = Array<MazeCell[]>;
export type MazePickMode = "latest" | "random" | "both";

export interface MazeCell extends GridCell {
    visited: boolean;
    state: "wall" | "path" | "start" | "end";
    display: "empty" | "wall" | "path" | "blocked" | "start" | "current" | "end";
    neighbors: { left?: MazeCell; top?: MazeCell; right?: MazeCell; bottom?: MazeCell };
}

export const getMazeGrid = (width: number, height: number) =>
    makeGrid(width, height, () => ({ display: "empty", state: "wall", visited: false })) as MazeGridType;

const makeNotABorderCellFilter = (width: number, height: number) => (cell: MazeCell) =>
    cell.x > 0 && cell.x < width - 1 && cell.y > 0 && cell.y < height - 1;

const getInitialGrid = (width: number, height: number) => {
    const grid = getMazeGrid(width, height);
    const flat = grid.flat();
    const notABorderCell = makeNotABorderCellFilter(width, height);

    const list = flat.filter(notABorderCell);
    const first = pickOne(list);

    first.display = "path";
    first.visited = true;

    return { grid, list, first, notABorderCell };
};
