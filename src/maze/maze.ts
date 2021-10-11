import { last, pickOne } from "@pastable/utils";

import { MazeCell, getMazeGrid } from "./mazeMachine";

let aaa = 0;

/**
 * - Let C be a list of cells, initially empty. Add one a random cell from the maze to C.
 * - Choose a cell from C, and carve a passage to any unvisited neighbor of that cell, adding that neighbor to C as well.
 *   If there are no unvisited neighbors, remove the cell from C.
 * - Repeat step 2 until C is empty.
 */
export const generateMaze = ({ width, height }: { width: number; height: number }) => {
    // const grid = makeArrayOf(width).map((_, x) => makeArrayOf(height).map((_, y) => ({ x, y, })))
    // console.log({ aaa });
    const grid = getMazeGrid(width, height);
    const list = grid.flat();

    const first = pickOne(list);
    first.visited = true;

    const cells = [first];
    // console.log(list);
    let picked: MazeCell, neighbor: MazeCell, unvisiteds: MazeCell[];
    printMaze();

    while (cells.length) {
        aaa++;
        // picked = pickOne(cells);
        picked = last(cells);
        picked.state = "path";
        picked.visited = true;
        unvisiteds = getUnvisitedNeighbors(picked);
        neighbor = pickOne(unvisiteds);
        console.log(picked, unvisiteds, neighbor);

        if (neighbor) {
            cells.push(neighbor);
            // unvisiteds.forEach((cell) => (cell.visited = true));
            neighbor.state = "path";
            neighbor.visited = true;
        } else {
            cells.splice(
                cells.findIndex((cell) => cell.id === picked.id),
                1
            );
        }
        picked.state = "end";
        printMaze();
        picked.state = "path";

        if (aaa > 1000) break;
    }

    function printMaze() {
        return;
        console.log("---START---");
        grid.forEach((row) => {
            // console.log(row.map((cell) => symbolByDirection[cell.direction]).join(""));
            // console.log(row.map((cell) => (cell.state === "path" ? "." : "X")).join(" "));
            console.log(row.map((cell) => symbolsByState[cell.state]).join(" "));
            // console.log(row.map((cell) => (cell.visited ? " " : "X")).join(""));
        });
        // console.log(picked, neighbor);
        // console.log(picked && getUnvisitedNeighbors(picked));
    }
    // picked.state = "end";
    first.state = "start";

    printMaze();
    console.log(cells);
    console.log("done", aaa);

    return grid;
};

const symbolsByState: Record<MazeCell["state"], string> = { wall: "X", start: "O", end: "<>", path: "." };
export const getUnvisitedNeighbors = (cell: MazeCell) =>
    Object.values(cell.neighbors)
        .filter((neighbor) => !neighbor?.visited)
        .filter(Boolean);
// .map(([direction, neighbor]) => [direction, neighbor.neighbors[direction]]);
// const pickUnvisitedNeighbor = (cell:MazeCell) => pickOne(getUnvisitedNeighbors(cell)) as [Direction,MazeCell];
const pickUnvisitedNeighbor = (cell: MazeCell) => pickOne(getUnvisitedNeighbors(cell));

const getNeighborsId = (cell: MazeCell) =>
    Object.values(cell.neighbors)
        .filter(Boolean)
        .map((cell) => cell.id);
