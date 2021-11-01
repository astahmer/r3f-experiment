import { last, pickOne } from "@pastable/utils";
import { ContextFrom } from "xstate";
import { createModel } from "xstate/lib/model";

import { Direction, GridCell, getOppositeDirection, makeGrid } from "./grid";
import { createPathBruteForceMachine } from "./mazePathBruteForceMachine";
import { createPathFinderMachine } from "./mazePathFinderMachine";
import { defaultSettings } from "./utils";

/**
 * - Let C be a list of cells, initially empty. Add one a random cell from the maze to C.
 * - Choose a cell from C, and carve a passage to any unvisited neighbor of that cell, adding that neighbor to C as well.
 *   If there are no unvisited neighbors, remove the cell from C.
 * - Repeat step 2 until C is empty.
 */
export const createMazeGeneratorMachine = (args: MazeGeneratorArgs) => {
    const initialSettings: MazeSettings = { ...defaultSettings, ...args };
    const model = createMazeGeneratorModel(initialSettings);

    return model.createMachine(
        {
            initial: "incomplete",
            context: model.initialContext,
            states: {
                incomplete: {
                    on: {
                        STEP: [{ target: "done", actions: "step", cond: "isDone" }, { actions: "step" }],
                        RUN: { target: "running" },
                    },
                },
                running: {
                    after: {
                        [initialSettings.stepDelayInMs]: [
                            { target: "done", cond: "isDone" },
                            { target: "running", actions: "step" },
                        ],
                    },
                    on: { PAUSE: { target: "incomplete" } },
                },
                done: {
                    entry: [
                        (ctx) => {
                            console.log("done generating", ctx);
                        },
                        "openBorder",
                    ],
                    invoke: [
                        {
                            id: "bruteForcer",
                            autoForward: true,
                            src: (ctx) =>
                                createPathBruteForceMachine({
                                    grid: ctx.grid,
                                    stepDelayInMs: ctx.settings.stepDelayInMs,
                                }),
                        },
                        {
                            id: "finder",
                            autoForward: true,
                            src: (ctx) =>
                                createPathFinderMachine({ grid: ctx.grid, stepDelayInMs: ctx.settings.stepDelayInMs }),
                        },
                    ],
                },
            },
            on: {
                UpdateSettings: { actions: "updateSettings" },
                RESET: { target: "incomplete", actions: "reset" },
                IMPORT: { target: "done", actions: "import" },
            },
        },
        {
            actions: {
                /** Update a key in settings with given value, also reset to initial grid context if key is width or height */
                updateSettings: model.assign((ctx, event) => {
                    const settings = { ...ctx.settings, [event.key]: event.value };
                    if (!event.shouldRefreshGrid) return { ...ctx, settings };

                    return { ...ctx, ...getFreshGridContext(settings.width, settings.height), settings };
                }, "UpdateSettings") as any,
                import: model.assign((ctx, e) => {
                    const states = e.states;
                    if (!states?.length) return;

                    const updatedCtx = getFreshGridContext(states[0].length, states.length);

                    // Ignore borders
                    const statesList = states
                        // .slice(1, -1)
                        // .map((row) => row.slice(1, -1))
                        .flat();

                    // Set grid states from the imported data
                    updatedCtx.grid
                        // .slice(1, -1)
                        // .map((row) => row.slice(1, -1))
                        .flat()
                        .forEach((v, i) => {
                            v.state = statesList[i];
                            v.display = statesList[i];
                            v.visited = true;
                        });

                    return { ...ctx, ...updatedCtx };
                }, "IMPORT") as any,
                reset: model.assign((ctx) => ({
                    ...ctx,
                    ...getFreshGridContext(ctx.settings.width, ctx.settings.height),
                })),
                step: model.assign((ctx) => {
                    const cells = [...ctx.cells];

                    // Choose a cell from C
                    const currentCell = pickCellWithMode(ctx.settings, cells);
                    currentCell.visited = true;
                    currentCell.display = "path";
                    currentCell.state = "path";

                    const neighbors = Object.entries(currentCell.neighbors).filter(([_dir, cell]) => {
                        if (!cell) return false;
                        if (cell.visited) return false;

                        const nextNeighbors = Object.values(cell.neighbors);
                        const hasPath = nextNeighbors.some(
                            (next) => next && next.id !== currentCell.id && next.state === "path"
                        );
                        if (hasPath) return false;

                        return true;
                    });

                    // Keep track of which cells has their displayed changed with that step
                    const displayChanged = [currentCell];

                    // If there are no unvisited neighbors, remove the cell from C.
                    if (!neighbors.length) {
                        cells.splice(
                            cells.findIndex((cell) => cell.id === currentCell.id),
                            1
                        );
                        currentCell.display = "blocked";
                        return { ...ctx, cells, currentCell, displayChanged };
                    }

                    // and carve a passage to any unvisited neighbor of that cell
                    const [dir, nextCell] = pickOne(neighbors);
                    const direction = dir as Direction;
                    const opposite = getOppositeDirection(direction);

                    neighbors
                        .filter(([dir, cell]) => cell.id !== currentCell.id && dir !== direction && dir !== opposite)
                        .forEach(([dir, cell]) => {
                            cell.visited = true;
                            cell.display = "wall";
                            cell.state = "wall";
                            displayChanged.push(cell);
                        });

                    // adding that neighbor to C as well.
                    cells.push(nextCell);
                    nextCell.visited = true;
                    nextCell.display = "current";
                    nextCell.state = "path";
                    displayChanged.push(nextCell);

                    return { ...ctx, cells, currentCell, displayChanged };
                }),
                openBorder: model.assign((ctx) => {
                    // Clean display
                    const paths = ctx.list.filter((cell) => cell.state === "path");
                    paths.forEach((cell) => (cell.display = "path"));

                    return ctx;
                }),
            },
            guards: {
                isDone: (ctx) => !ctx.cells.length,
            },
        }
    );
};

const getFreshGridContext = (width: number, height: number) => {
    const { grid, list, first } = getInitialGrid(width, height);
    return { grid, list, cells: [first], currentCell: null as MazeCell };
};

const noop = () => ({});
const createMazeGeneratorModel = (settings: MazeSettings) => {
    const { grid, list, cells, currentCell } = getFreshGridContext(settings.width, settings.height);

    return createModel(
        { grid, list, cells, currentCell, settings, displayChanged: [cells[0]] },
        {
            events: {
                RESET: noop,
                STEP: noop,
                PAUSE: noop,
                RUN: noop,
                IMPORT: (states: Array<MazeCell["state"][]>) => ({ states }),
                UpdateSettings: (args: UpdateSettingsArgs) => args,
            },
        }
    );
};

interface MazeGeneratorArgs {
    width: number;
    height: number;
    stepDelayInMs?: number;
    random?: number;
    projection?: number;
    mode?: MazePickMode;
}
export type MazeSettings = Required<MazeGeneratorArgs>;
export interface UpdateSettingsArgs {
    key: string;
    value: any;
    shouldRefreshGrid?: boolean;
}
export type MazeGeneratorContext = ContextFrom<ReturnType<typeof createMazeGeneratorModel>>;

export type MazeGridType = Array<MazeCell[]>;
export type MazePickMode = "latest" | "random" | "both";

export interface MazeCell extends GridCell {
    visited: boolean;
    direction: Direction;
    state: "wall" | "path" | "start" | "end";
    display: "empty" | "wall" | "path" | "blocked" | "start" | "current" | "end" | "mark";
    neighbors: Record<Direction, MazeCell | undefined>;
}

export const getMazeGrid = (width: number, height: number) =>
    makeGrid(width, height, () => ({
        display: "empty",
        state: "wall",
        visited: false,
        direction: null,
    })) as MazeGridType;

const getInitialGrid = (width: number, height: number) => {
    const grid = getMazeGrid(width, height);
    const list = grid.flat();
    const first = pickOne(list);

    first.display = "path";
    first.visited = true;

    return { grid, list, first };
};

const pickCellWithMode = (settings: MazeSettings, cells: MazeCell[]) => {
    if (settings.mode === "both") return settings.random / 100 > Math.random() ? pickOne(cells) : last(cells);
    if (settings.mode === "latest") return last(cells);
    if (settings.mode === "random") return pickOne(cells);
};
