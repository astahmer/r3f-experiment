import { Stack } from "@chakra-ui/layout";
import { ChakraProvider, Portal, chakra } from "@chakra-ui/react";
import { Html } from "@react-three/drei";
import { ActorRefFrom, AnyInterpreter } from "xstate";

import { MazeGridType } from "@/maze/mazeGeneratorMachine";

import { BruteForcerActions } from "./BruteForcerActions";
import { MazeActions, MazeGeneratorActions } from "./MazeActions";
import { createPathBruteForceMachine } from "./mazePathBruteForceMachine";
import { createPathFinderMachine } from "./mazePathFinderMachine";
import { PathFinderActions } from "./PathFinderActions";
import { useMazePanel } from "./useMazePanel";

export function MazeControls({
    state,
    send,
    maze,
    bruteForcer,
    finder,
    repaintMaze,
}: {
    state: string;
    send: AnyInterpreter["send"];
    maze: MazeGridType;
    bruteForcer: ActorRefFrom<ReturnType<typeof createPathBruteForceMachine>>;
    finder: ActorRefFrom<ReturnType<typeof createPathFinderMachine>>;
    repaintMaze: () => void;
}) {
    return (
        <Html prepend>
            <ChakraProvider>
                <Portal>
                    <chakra.div pos="absolute" bottom="0" left="0" userSelect="none">
                        <Stack pointerEvents="none">
                            <MazeGeneratorActions state={state as any} send={send} />
                            <MazeActions getMaze={() => maze} state={state as any} send={send} />
                            {state === "done" && bruteForcer && <BruteForcerActions actor={bruteForcer} />}
                            {state === "done" && finder && (
                                <PathFinderActions finder={finder} paintMaze={repaintMaze} />
                            )}
                        </Stack>
                    </chakra.div>
                </Portal>
            </ChakraProvider>
            <Settings send={send} />
        </Html>
    );
}

const Settings = ({ send }) => {
    const settings = useMazePanel((update) => send("UpdateSettings", update));
    // return <LevaPanel store={store} />;
    return null;
};
