import { ObjectLiteral, pickOne } from "@pastable/core";

export interface GridCell {
    id: string;
    x: number;
    y: number;
    neighbors: { left?: GridCell; top?: GridCell; right?: GridCell; bottom?: GridCell };
}

export function makeGrid<CellProps = ObjectLiteral>(
    width: number,
    height: number,
    getCellProps?: (cell: GridCell) => CellProps
): Array<Array<GridCell & CellProps>> {
    const grid = [] as Array<Array<GridCell>>;

    let x = 0,
        y = 0,
        col = undefined as GridCell,
        row = undefined as Array<GridCell>,
        cell = undefined as GridCell;
    for (y = 0; y < height; y++) {
        if (!grid[y]) grid[y] = [];
        col = undefined;

        for (x = 0; x < width; x++) {
            cell = {
                id: x + "/" + y,
                x,
                y,
                neighbors: { left: col, top: row?.[x], right: undefined, bottom: undefined },
            };
            if (getCellProps) {
                cell = { ...cell, ...getCellProps(cell) };
            }

            if (y > 0) {
                grid[y - 1][x].neighbors.bottom = cell;
            }
            if (x > 0) {
                grid[y][x - 1].neighbors.right = cell;
            }

            grid[y][x] = cell;
            col = cell;
        }

        row = grid[y];
    }

    return grid as Array<Array<GridCell & CellProps>>;
}

const directions = ["left", "top", "right", "bottom"] as Array<keyof GridCell["neighbors"]>;
const oppositesByDir: Record<Direction, Direction> = { left: "right", top: "bottom", right: "left", bottom: "top" };

export const getRandomDirection = () => pickOne(directions);
export const getOppositeDirection = (dir: Direction) => oppositesByDir[dir];
export type Direction = keyof GridCell["neighbors"];
