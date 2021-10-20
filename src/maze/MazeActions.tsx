import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { chunk, reverse } from "@pastable/core";
import { AnyInterpreter } from "xstate";

import { MazeCell, MazeGridType } from "@/maze/mazeGeneratorMachine";

export function MazeGeneratorActions({
    state,
    send,
}: {
    state: "incomplete" | "running" | "done";
    send: AnyInterpreter["send"];
}) {
    return (
        <HStack pointerEvents="all">
            <Button onClick={() => send("RESET")}>Reset</Button>
            <Button onClick={() => send("STEP")} isDisabled={state === "running" || state === "done"}>
                Step
            </Button>
            <Button onClick={() => send("RUN")} isDisabled={state === "running" || state === "done"}>
                Auto run
            </Button>
            <Button onClick={() => send("PAUSE")} isDisabled={state !== "running"}>
                Pause
            </Button>
        </HStack>
    );
}

export const MazeActions = ({
    getMaze,
    state,
    send,
}: {
    getMaze: () => MazeGridType;
    state: "incomplete" | "running" | "done";
    send: AnyInterpreter["send"];
}) => {
    const exportMaze = () => {
        const serialized = serializeMaze(getMaze());
        const rebuilt = rebuildMaze(serialized);
        prompt("Serialized maze", serialized);
        console.log(serialized, rebuilt);
    };
    const importMaze = () => {
        const serialized = prompt("Paste the maze grid here");
        if (!serialized) return;

        try {
            const rebuilt = rebuildMaze(serialized);
            send({ type: "IMPORT", states: rebuilt });
        } catch (error) {
            console.log(error);
        }
    };
    // console.log(serializeMaze(getMaze()));

    return (
        <HStack pointerEvents="all">
            <Button onClick={importMaze} isDisabled={state === "running"}>
                Import
            </Button>
            <Button onClick={exportMaze} isDisabled={state !== "done"}>
                Export
            </Button>
            {/* <Button onClick={() => console.log(state.context)}>Log ctx</Button> */}
        </HStack>
    );
};

const mazeStateAsCode: Record<MazeCell["state"], number> = { wall: 0, path: 1, start: 2, end: 3 };
const stateCodeAsString = reverse(mazeStateAsCode);

const serializeCell = (cell: MazeCell) => mazeStateAsCode[cell.state];
const serializeMaze = (grid: MazeGridType) => {
    const cols = grid.length;
    const rows = grid[0].length;
    return `${cols}:${rows}/` + grid.flat().map(serializeCell).join(",");
};

const rebuildMaze = (serializedMaze: string): Array<MazeCell["state"][]> => {
    const [size, list] = serializedMaze.split("/");
    const [rows, cols] = size.split(":");
    const cells = list.split(",").map((state) => stateCodeAsString[state]);
    return chunk(cells, Number(cols));
};
