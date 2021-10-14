import { chakra } from "@chakra-ui/system";
import { Physics } from "@react-three/cannon";
import { Canvas } from "@react-three/fiber";
import { useAtomValue } from "jotai/utils";
import { Leva } from "leva";
import { Suspense, useState } from "react";

import { playerFinalStatesPathAtom } from "@/functions/store";
import { useKey } from "@/functions/useKey";

import { HtmlMaze } from "../maze/HtmlMaze";
import { AppWorld } from "./AppWorld";
import { CameraControls, cameraPosAtom } from "./CameraControls";
import { HUDCompass } from "./Compass";
import { GravityProvider, useControllableGravity } from "./Gravity";

export const AppCanvas = () => {
    const cameraPos = useAtomValue(cameraPosAtom);
    const [key, setKey] = useState(0);

    // restarts the machine so it doesn't remain like before the HMR update
    useKey("r", () => {
        setKey((key) => key + 1);
        console.clear();
    });

    return (
        <>
            <Canvas gl={{ antialias: false }} camera={{ position: cameraPos }}>
                <axesHelper />
                <CameraControls />
                <ambientLight />
                <pointLight position={[10, 10, 10]} />
                <Physics gravity={[0, 0, 0]}>
                    <GlobalGravityProvider />
                </Physics>
                <HUDCompass fullscreen />
            </Canvas>
            <chakra.div pos="absolute" top="0" right="0">
                <Leva fill hideCopyButton />
                <PlayerFinalStatePaths />
            </chakra.div>
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
        </>
    );
};

const PlayerFinalStatePaths = () => {
    const finalStatesPath = useAtomValue(playerFinalStatesPathAtom);
    return (
        <chakra.div pos="absolute" top="100%" left="0" whiteSpace="nowrap">
            <chakra.div p="2">
                {finalStatesPath.split(" / ").map((path) => (
                    <chakra.div key={path}>{path}</chakra.div>
                ))}
            </chakra.div>
        </chakra.div>
    );
};

const GlobalGravityProvider = () => {
    const ctx = useControllableGravity(
        {
            folderName: "globalGravity",
            initialGy: -10,
            initialValues: { isPaused: true },
            pauseKey: "y",
            reverseKey: "u",
        },
        { collapsed: true }
    );
    return (
        <GravityProvider {...ctx}>
            <Suspense fallback={null}>
                <AppWorld />
            </Suspense>
        </GravityProvider>
    );
};
