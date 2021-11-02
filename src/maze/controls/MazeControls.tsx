import { Stack } from "@chakra-ui/layout";
import { ChakraProvider, Portal, chakra } from "@chakra-ui/react";
import { Html } from "@react-three/drei";
import { useEffect } from "react";
import { ActorRefFrom, AnyInterpreter } from "xstate";

import { MazeGridType, createMazeGeneratorMachine } from "@/maze/mazeGeneratorMachine";

import { createPathBruteForceMachine } from "../mazePathBruteForceMachine";
import { createPathFinderMachine } from "../mazePathFinderMachine";
import { BruteForcerActions } from "./BruteForcerActions";
import { MazeActions, MazeGeneratorActions } from "./MazeActions";
import { PathFinderActions } from "./PathFinderActions";
import { useMazePanel } from "./useMazePanel";

export function MazeControls({
    state,
    send,
    service,
    maze,
    bruteForcer,
    finder,
    repaintMaze,
    showUI,
}: {
    state: string;
    send: AnyInterpreter["send"];
    maze: MazeGridType;
    service: ActorRefFrom<ReturnType<typeof createMazeGeneratorMachine>>;
    bruteForcer: ActorRefFrom<ReturnType<typeof createPathBruteForceMachine>>;
    finder: ActorRefFrom<ReturnType<typeof createPathFinderMachine>>;
    repaintMaze: () => void;
    showUI?: boolean;
}) {
    return (
        <Html prepend>
            <ChakraProvider>
                <Portal>
                    <chakra.div pos="absolute" bottom="0" left="0" userSelect="none" display={showUI ? "" : "none"}>
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
            <Settings service={service} />
        </Html>
    );
}

const Settings = ({ service }: { service: ActorRefFrom<ReturnType<typeof createMazeGeneratorMachine>> }) => {
    const send = service.send;
    const setPanelValues = useMazePanel((update) => send({ type: "UpdateSettings", ...update }));

    // Also set width/height in maze panel when importing
    useEffect(() => {
        if (!service) return;

        const sub = service.subscribe((next) => {
            if (next.event.type !== "IMPORT") return;

            const states = next.event.states;
            const width = states[0].length;
            const height = states.length;
            setPanelValues({ width, height });
        });
        return sub.unsubscribe;
    }, [service]);

    // return <LevaPanel store={store} />;
    return null;
};
