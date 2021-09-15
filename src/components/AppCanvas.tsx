import { useEventListener } from "@chakra-ui/react";
import { useEvent } from "@pastable/core";
import { Physics } from "@react-three/cannon";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { atom, useAtom } from "jotai";
import { useAtomValue } from "jotai/utils";
import { Suspense, useEffect } from "react";

import { CameraControls, cameraPosAtom } from "./CameraControls";
import { Ground, PlayerBox } from "./PlayerBox";

export const AppCanvas = () => {
    const cameraPos = useAtomValue(cameraPosAtom);
    return (
        // <Canvas gl={{ antialias: false }} camera={{ position: [0, 6, 10], up: [0, -1, 0], zoom: 1 }}>
        <Canvas gl={{ antialias: false }} camera={{ position: cameraPos }}>
            <axesHelper />
            <Suspense fallback={null}>{/* <Spritesheet /> */}</Suspense>
            <CameraControls />
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            {/* <OrbitControls /> */}
            <Physics gravity={[0, -50, 0]}>
                <group position={[0, 5, 0]}>
                    <PlayerBox />
                    <Ground />
                </group>
            </Physics>
        </Canvas>
    );
};
