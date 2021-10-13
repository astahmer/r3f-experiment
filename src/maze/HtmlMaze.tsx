import { Button } from "@chakra-ui/button";
import { Flex, FlexProps, HStack, Stack } from "@chakra-ui/layout";
import { Portal, Tooltip } from "@chakra-ui/react";
import { chakra } from "@chakra-ui/system";
import { WithChildren, chunk, reverse } from "@pastable/core";
import { useActor, useMachine } from "@xstate/react";
import { LevaPanel, useControls, useCreateStore } from "leva";

import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";
import { MazeCell, MazePickMode, createMazeMachine } from "@/maze/mazeMachine";

import { MazeSolverContext } from "./mazeSolverMachine";

export const HtmlMaze = () => {
    // console.log(printFinalStatesPath(state), maze);

    const store = useCreateStore();
    const { mode, projection, width, height, random } = useControls(
        "maze",
        {
            mode: {
                options: ["both", "latest", "random"] as Array<MazePickMode>,
                value: "both" as MazePickMode,
                transient: false,
                onChange: (value) => send("MODE", { value }),
            },
            projection: { value: 1, min: 0, max: 5, step: 1 },
            width: { value: 5, min: 4, max: 40, step: 2 },
            height: { value: 5, min: 4, max: 40, step: 2 },
            random: { value: 30, min: 1, max: 100, step: 5 },
            // state: { value: printFinalStatesPath(state), disabled: true },
        },
        { store }
    );
    const [state, send] = useMachine(() =>
        createMazeMachine({ width, height, stepDelayInMs: 0, randomChance: random, projection, mode })
    );
    const maze = state.context.grid;
    const exportMaze = () => {
        console.log(state.context, maze);
        const serialized = serializeMaze(maze);
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
        <>
            <Stack pointerEvents="none">
                <Flex maxW="80%" maxH="80%" flexDirection="column" pointerEvents="all">
                    <Flex ml="30px">
                        {maze[0].map((_, i) => (
                            <Cell key={i} display="path" border="none">
                                x{i}
                            </Cell>
                        ))}
                    </Flex>
                    {maze.map((rows, y) => (
                        <Flex key={y}>
                            <chakra.div>
                                <Cell display="path" border="none">
                                    y{y}
                                </Cell>
                            </chakra.div>
                            {rows.map((cell, x) => (
                                <Tooltip label={cell.id} key={x}>
                                    <div>
                                        <Cell key={x} display={cell.display}>
                                            {cell.visited ? "1" : "0"}
                                        </Cell>
                                    </div>
                                </Tooltip>
                            ))}
                        </Flex>
                    ))}
                </Flex>

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
                    <Button onClick={() => send("PAUSE")} isDisabled={!state.matches("running")}>
                        Pause
                    </Button>
                </HStack>
                <HStack pointerEvents="all">
                    <Button onClick={importMaze} isDisabled={state.matches("running")}>
                        Import
                    </Button>
                    <Button onClick={exportMaze} isDisabled={!state.matches("done")}>
                        Export
                    </Button>
                </HStack>
                {state.matches("done") && state.children.solver && <Solver actor={state.children.solver} />}
            </Stack>
            <Portal>
                <LevaPanel store={store} />
            </Portal>
        </>
    );
};

const Cell = ({
    children,
    display,
    ...props
}: Pick<MazeCell, "display"> & WithChildren & Omit<FlexProps, "display">) => (
    <Flex
        boxSize="30px"
        minWidth="30px"
        backgroundColor={colorByState[display]}
        border="1px solid salmon"
        color="blue"
        justifyContent="center"
        alignItems="center"
        userSelect="none"
        {...props}
    >
        {children}
    </Flex>
);

const mazeStateAsCode: Record<MazeCell["state"], number> = { wall: 0, path: 1, start: 2, end: 3 };
const stateCodeAsString = reverse(mazeStateAsCode);

const serializeCell = (cell: MazeCell) => mazeStateAsCode[cell.state];
const serializeMaze = (grid: Array<MazeCell[]>) => {
    const cols = grid.length;
    const rows = grid[0].length;
    return `${cols}:${rows}/` + grid.flat().map(serializeCell).join(",");
};

const rebuildMaze = (serializedMaze: string): Array<MazeCell["state"][]> => {
    const [size, list] = serializedMaze.split("/");
    const [cols] = size.split(":");
    const cells = list.split(",").map((state) => stateCodeAsString[state]);
    return chunk(cells, Number(cols));
};

const Solver = ({ actor }) => {
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
            </HStack>
            <span>{printFinalStatesPath(state)}</span>
            <span>
                root: {rootCell} / lastBranch: {lastBranch} / currentCell: {currentCell}
            </span>
        </>
    );
};

const colorByState: Record<MazeCell["display"], string> = {
    empty: "dimgrey",
    wall: "burlywood",
    path: "white",
    blocked: "cadetblue",
    start: "green",
    current: "yellow",
    end: "salmon",
};
