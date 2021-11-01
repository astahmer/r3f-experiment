import { Stack } from "@chakra-ui/layout";
import { chakra } from "@chakra-ui/react";
import { useMachine } from "@xstate/react";
import { useAtomValue } from "jotai/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { useKey } from "@/functions/useKey";
import { MazeGridType, createMazeGeneratorMachine } from "@/maze/mazeGeneratorMachine";

import { BruteForcerActions } from "./BruteForcerActions";
import { MazeActions, MazeGeneratorActions } from "./MazeActions";
import { MazeGrid } from "./MazeGrid";
import { useAtomSyncCallback } from "./useAtomSyncCallback";
import { useMazePanel } from "./useMazePanel";
import { settingsAtom } from "./utils";

export const HtmlMaze = () => {
    // console.log(printFinalStatesPath(state), maze);

    useMazePanel((update) => send("UpdateSettings", update));
    const getSettings = useAtomSyncCallback((get) => get(settingsAtom));
    const [state, send] = useMachine(() => createMazeGeneratorMachine(getSettings()));

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
                {state.matches("done") && state.children.bruteForcer && (
                    <BruteForcerActions actor={state.children.bruteForcer} />
                )}
            </Stack>
            {/* <Portal>
                <LevaPanel store={store} />
            </Portal> */}
        </>
    );
};

export const HtmlMazeWrapper = () => {
    const [key, setKey] = useState(0);

    // restarts the machine so it doesn't remain like before the HMR update
    useKey("r", () => {
        setKey((key) => key + 1);
        console.clear();
    });

    return (
        <chakra.div
            pos="absolute"
            boxSize="100%"
            inset="0"
            display="flex"
            justifyContent="center"
            alignItems="center"
            pointerEvents="none"
        >
            <HtmlMaze key={key} />
        </chakra.div>
    );
};
