import { chakra } from "@chakra-ui/system";
import { Physics } from "@react-three/cannon";
import { Canvas } from "@react-three/fiber";
import { useAtomValue } from "jotai/utils";
import { Leva, useControls } from "leva";

import { successToast } from "@/functions/toasts";
import { useKey } from "@/functions/useKey";

import { AppWorld } from "./AppWorld";
import { CameraControls, cameraPosAtom } from "./CameraControls";

export const AppCanvas = () => {
    const cameraPos = useAtomValue(cameraPosAtom);

    useKey("h", () => {
        successToast({ title: `With gravity ${!isReversedPhysicsGravity}` });
        set({ isReversedPhysicsGravity: !isReversedPhysicsGravity });
    });
    const [{ isReversedPhysicsGravity, physicsGravityY }, set] = useControls(() => ({
        isReversedPhysicsGravity: false,
        physicsGravityY: { min: -100, max: 100, step: 5, value: 50 },
    }));
    const gravity = [0, isReversedPhysicsGravity ? physicsGravityY : 0, 0];

    return (
        <>
            <Canvas gl={{ antialias: false }} camera={{ position: cameraPos }}>
                <axesHelper />
                <CameraControls />
                <ambientLight />
                <pointLight position={[10, 10, 10]} />
                <Physics gravity={gravity}>
                    <AppWorld />
                </Physics>
            </Canvas>
            <chakra.div pos="absolute" top="0" right="0" with="300px">
                <Leva fill hideCopyButton />
            </chakra.div>
        </>
    );
};
