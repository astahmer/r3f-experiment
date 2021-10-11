import { Button } from "@chakra-ui/button";
import { HStack, Stack } from "@chakra-ui/layout";
import { Tooltip } from "@chakra-ui/react";
import { chakra } from "@chakra-ui/system";
import { useActor, useMachine } from "@xstate/react";
import { useControls } from "leva";
import { useState } from "react";
import { State } from "xstate";

import { useKey } from "@/functions/useKey";
import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";
import { MazeCell, createMazeMachine } from "@/maze/mazeMachine";

export const HtmlMaze = () => {
    // console.log(printFinalStatesPath(state), maze);

    const { mode, projection, width, height, random } = useControls("maze", {
        mode: {
            options: ["both", "latest", "random"],
            value: "both",
            transient: false,
            onChange: (value) => send("MODE", { value }),
        },
        projection: { value: 1, min: 0, max: 5, step: 1 },
        width: { value: 5, min: 4, max: 40, step: 2 },
        height: { value: 5, min: 4, max: 40, step: 2 },
        random: { value: 30, min: 1, max: 100, step: 5 },
        // state: { value: printFinalStatesPath(state), disabled: true },
    });
    const [state, send, service] = useMachine(() =>
        createMazeMachine({ width, height, stepDelayInMs: 0, randomChance: random, projection })
    );
    const maze = state.context.grid;
    // console.log(state, service);

    return (
        <Stack pointerEvents="none">
            <chakra.div maxW="80%" maxH="80%" display="flex" flexDirection="column" pointerEvents="all">
                {maze.map((rows, y) => (
                    <chakra.div key={y} display="flex">
                        {rows.map((cell, x) => (
                            <Tooltip label={cell.id} key={x}>
                                <chakra.div
                                    key={x}
                                    boxSize="30px"
                                    minWidth="30px"
                                    backgroundColor={colorByState[cell.display]}
                                    border="1px solid salmon"
                                    color="blue"
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                >
                                    {cell.visited ? "1" : "0"}
                                </chakra.div>
                            </Tooltip>
                        ))}
                    </chakra.div>
                ))}
            </chakra.div>

            <HStack pointerEvents="all">
                <Button onClick={() => send("RESET")}>Reset</Button>
                <Button onClick={() => send("STEP")} isDisabled={state.matches("running") || state.matches("done")}>
                    Step
                </Button>
                <Button onClick={() => send("RUN")} isDisabled={state.matches("running") || state.matches("done")}>
                    Run
                </Button>
                <Button onClick={() => send("PAUSE")} isDisabled={!state.matches("running")}>
                    Pause
                </Button>
            </HStack>
            {state.matches("done") && <Solver actor={state.children.solver} />}
        </Stack>
    );
};

const Solver = ({ actor }) => {
    const [state, send] = useActor(actor) as any as [AnyState, Function];
    console.log(printFinalStatesPath(state));

    return (
        <HStack pointerEvents="all">
            <Button
                onClick={() => send("STEP")}
                isDisabled={state.matches("done.solving") || state.matches("done.end")}
            >
                Solve Step
            </Button>
            <Button onClick={() => send("RUN")} isDisabled={state.matches("done.solving") || state.matches("done.end")}>
                Solve Auto
            </Button>
            <Button onClick={() => send("PAUSE")} isDisabled={!state.matches("done.solving")}>
                Pause solving
            </Button>
        </HStack>
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
