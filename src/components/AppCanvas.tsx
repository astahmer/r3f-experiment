import { chakra } from "@chakra-ui/system";
import { Physics } from "@react-three/cannon";
import { Canvas } from "@react-three/fiber";
import { useAtomValue } from "jotai/utils";
import { Leva } from "leva";

import { playerFinalStatesPathAtom } from "@/functions/store";

import { AppWorld } from "./AppWorld";
import { CameraControls, cameraPosAtom } from "./CameraControls";
import { GravityProvider, useControllableGravity } from "./Gravity";

export const AppCanvas = () => {
    const cameraPos = useAtomValue(cameraPosAtom);

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
            </Canvas>
            <chakra.div pos="absolute" top="0" right="0">
                <Leva fill hideCopyButton />
                <PlayerFinalStatePaths />
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
            <AppWorld />
        </GravityProvider>
    );
};
