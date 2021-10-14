import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { chunk, reverse } from "@pastable/core";
import { useActor } from "@xstate/react";
import { AnyInterpreter } from "xstate";

import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";
import { MazeCell } from "@/maze/mazeMachine";

import { MazeSolverContext } from "./mazeSolverMachine";

export function MazeGeneratorActions({ state, send }: { state: AnyState; send: AnyInterpreter["send"] }) {
    return (
        <HStack pointerEvents="all">
            <Button onClick={() => send("RESET")}>Reset</Button>
            <Button onClick={() => send("STEP")} isDisabled={state.matches("running") || state.matches("done")}>
                Step
            </Button>
            <Button onClick={() => send("RUN")} isDisabled={state.matches("running") || state.matches("done")}>
                Auto run
            </Button>
            <Button onClick={() => send("PAUSE")} isDisabled={!state.matches("running")}>
                Pause
            </Button>
        </HStack>
    );
}

const mazeStateAsCode: Record<MazeCell["state"], number> = { wall: 0, path: 1, start: 2, end: 3 };
const stateCodeAsString = reverse(mazeStateAsCode);

const serializeCell = (cell: MazeCell) => mazeStateAsCode[cell.state];
export const serializeMaze = (grid: Array<MazeCell[]>) => {
    const cols = grid.length;
    const rows = grid[0].length;
    return `${cols}:${rows}/` + grid.flat().map(serializeCell).join(",");
};

export const rebuildMaze = (serializedMaze: string): Array<MazeCell["state"][]> => {
    const [size, list] = serializedMaze.split("/");
    const [cols] = size.split(":");
    const cells = list.split(",").map((state) => stateCodeAsString[state]);
    return chunk(cells, Number(cols));
};

export const MazeActions = ({
    getMaze,
    state,
    send,
}: {
    getMaze: () => Array<MazeCell[]>;
    state: AnyState;
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

        const rebuilt = rebuildMaze(serialized);
        // @ts-ignore
        send({ type: "IMPORT", states: rebuilt });
    };

    return (
        <HStack pointerEvents="all">
            <Button onClick={importMaze} isDisabled={state.matches("running")}>
                Import
            </Button>
            <Button onClick={exportMaze} isDisabled={!state.matches("done")}>
                Export
            </Button>
            <Button onClick={() => console.log(state.context)}>Log ctx</Button>
        </HStack>
    );
};

export const SolverActions = ({ actor }) => {
    const [state, send] = useActor(actor) as any as [AnyState<MazeSolverContext>, Function];
    const rootCell = state.context.rootCell?.id;
    const lastBranch = state.context.lastBranchSnapshot?.currentCell?.id;
    const currentCell = state.context.currentCell?.id;
    // console.log(state.context.steps, state.context);

    return (
        <>
            <HStack pointerEvents="all">
                <Button
                    onClick={() => send("SOLVE_STEP")}
                    isDisabled={state.matches("done") || state.context.mode === "auto"}
                >
                    Solve Step
                </Button>
                <Button
                    onClick={() => send("TOGGLE_MODE")}
                    isDisabled={state.matches("done") || state.context.mode === "auto"}
                >
                    Auto Solve
                </Button>
                <Button
                    onClick={() => send("TOGGLE_MODE")}
                    isDisabled={state.matches("done") || state.context.mode !== "auto"}
                >
                    Pause solving
                </Button>
                <Button onClick={() => console.log(state.context)}>Log ctx</Button>
            </HStack>
            <span>{printFinalStatesPath(state)}</span>
            <span>
                root: {rootCell} / lastBranch: {lastBranch} / currentCell: {currentCell}
            </span>
        </>
    );
};
