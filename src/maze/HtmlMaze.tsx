import { Stack } from "@chakra-ui/layout";
import { Portal } from "@chakra-ui/react";
import { useMachine } from "@xstate/react";
import { LevaPanel } from "leva";
import { useCallback, useEffect, useRef } from "react";

import { MazeGridType, createMazeMachine } from "@/maze/mazeMachine";

import { MazeActions, MazeGeneratorActions, SolverActions } from "./MazeActions";
import { MazeGrid } from "./MazeGrid";
import { useMazePanel } from "./useMazePanel";

// TODO check that it still works
export const HtmlMaze = () => {
    // console.log(printFinalStatesPath(state), maze);

    const { store, mode, projection, width, height, random } = useMazePanel((value) => send("MODE", { value }));
    const [state, send] = useMachine(() =>
        createMazeMachine({ width, height, stepDelayInMs: 0, randomChance: random, projection, mode })
    );

    const maze = state.context.grid;
    const mazeRef = useRef<MazeGridType>(null!);
    useEffect(() => {
        mazeRef.current = maze;
    }, [maze]);

    const getMaze = useCallback(() => mazeRef.current, []);

    return (
        <>
            <Stack pointerEvents="none">
                <MazeGrid maze={maze} />
                <MazeGeneratorActions state={state.value as any} send={send} />
                <MazeActions getMaze={getMaze} state={state.value as any} send={send} />
                {state.matches("done") && state.children.solver && <SolverActions actor={state.children.solver} />}
            </Stack>
            <Portal>
                <LevaPanel store={store} />
            </Portal>
        </>
    );
};
