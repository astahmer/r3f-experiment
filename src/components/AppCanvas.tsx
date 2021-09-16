import { chakra } from "@chakra-ui/system";
import { Physics } from "@react-three/cannon";
import { Canvas } from "@react-three/fiber";
import { useAtomValue } from "jotai/utils";
import { Leva } from "leva";

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
            <chakra.div pos="absolute" top="0" right="0" with="300px">
                <Leva fill hideCopyButton />
            </chakra.div>
        </>
    );
};

const GlobalGravityProvider = () => {
    const ctx = useControllableGravity({
        folderName: "globalGravity",
        initialGy: -10,
        initialValues: { isPaused: false },
        pauseKey: "y",
        reverseKey: "u",
    });
    return (
        <GravityProvider {...ctx}>
            <AppWorld />
        </GravityProvider>
    );
};
