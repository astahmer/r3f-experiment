import { Triplet } from "@react-three/cannon";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { atom, useAtom } from "jotai";
import { atomWithStorage, useUpdateAtom } from "jotai/utils";
import { useRef } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { successToast } from "@/functions/toasts";
import { useKey } from "@/functions/useKey";

extend({ OrbitControls });

const initialCameraPosition = [0, 6, 10] as Triplet;
export const cameraPosAtom = atomWithStorage("r3f/cameraPos", initialCameraPosition);
export const CameraControls = () => {
    const {
        camera,
        gl: { domElement },
    } = useThree();

    const controls = useRef(null);
    useFrame(() => {
        controls.current.update();
    });

    const setPosition = useUpdateAtom(cameraPosAtom);
    useKey("c", () => {
        setPosition(camera.position.toArray());
        successToast({ title: "Saved camera position !", description: camera.position.toArray().join(",") });
    });
    useKey("x", () => {
        camera.position.set(...initialCameraPosition);
        setPosition(initialCameraPosition);
    });

    return (
        //@ts-ignore
        <orbitControls
            ref={controls}
            args={[camera, domElement]}
            enableZoom={true}
            maxPolarAngle={Math.PI}
            minPolarAngle={0}
        />
    );
};
