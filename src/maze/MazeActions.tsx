import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { chunk, reverse } from "@pastable/core";
import { useSelector } from "@xstate/react";
import { AnyInterpreter } from "xstate";

import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";
import { MazeCell, MazeGridType } from "@/maze/mazeMachine";

import { MazeSolverContext } from "./mazeSolverMachine";

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

        const rebuilt = rebuildMaze(serialized);
        send({ type: "IMPORT", states: rebuilt });
    };

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

const isDoneSelector = (state: AnyState) => state.matches("done");
const isAutoSelector = (state: AnyState<MazeSolverContext>) => state.context.mode === "auto";

export const SolverActions = ({ actor }) => {
    const isDone = useSelector(actor, isDoneSelector);
    const isAuto = useSelector(actor, isAutoSelector);

    const send = actor.send;

    return (
        <>
            <HStack pointerEvents="all">
                <Button onClick={() => send("SOLVE_STEP")} isDisabled={isDone || isAuto}>
                    Solve Step
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || isAuto}>
                    Auto Solve
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || !isAuto}>
                    Pause solving
                </Button>
                <Button onClick={() => console.log(actor.state.context)}>Log ctx</Button>
            </HStack>
            <DebugSolver actor={actor} />
        </>
    );
};

const DebugSolver = ({ actor }: { actor }) => {
    const rootCell = useSelector(actor, (state: AnyState<MazeSolverContext>) => state.context.rootCell?.id);
    const lastBranch = useSelector(
        actor,
        (state: AnyState<MazeSolverContext>) => state.context.lastBranchSnapshot?.currentCell?.id
    );
    const currentCell = useSelector(actor, (state: AnyState<MazeSolverContext>) => state.context.currentCell?.id);

    return (
        <>
            <DebugSolverState actor={actor} />
            <span>
                root: {rootCell} / lastBranch: {lastBranch} / currentCell: {currentCell}
            </span>
        </>
    );
};

const DebugSolverState = ({ actor }) => {
    const state = useSelector(actor, (state: AnyState<MazeSolverContext>) => printFinalStatesPath(state));

    return <span>{state}</span>;
};
