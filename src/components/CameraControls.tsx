import { safeJSONParse } from "@pastable/utils";
import { Triplet } from "@react-three/cannon";
import { MapControls, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { atomWithStorage, useUpdateAtom } from "jotai/utils";
import { button, useControls } from "leva";
import { useEffect, useRef } from "react";

import { successToast } from "@/functions/toasts";

type Rotation = Parameters<THREE.Euler["set"]>;
const initialCameraPosition = [0, 6, 10] as Triplet;
export const cameraPosAtom = atomWithStorage("r3f/cameraPos", initialCameraPosition);
export const cameraRotationAtom = atomWithStorage("r3f/cameraRotation", [0, 0, 0, "XYZ"] as Rotation);
export const cameraTypeAtom = atomWithStorage("r3f/cameraType", "Map");

export const CameraControls = () => {
    const {
        camera,
        gl: { domElement },
    } = useThree();

    const controls = useRef(null);
    useFrame(() => controls.current.update());

    const setPosition = useUpdateAtom(cameraPosAtom);
    const setRotation = useUpdateAtom(cameraRotationAtom);
    const setType = useUpdateAtom(cameraTypeAtom);

    const goToSavedPos = () => {
        const savedPos = safeJSONParse<Triplet>(localStorage.getItem("r3f/cameraPos"));
        if (!savedPos) return;
        const savedRotation = safeJSONParse<Rotation>(localStorage.getItem("r3f/cameraRotation"));

        camera.position.set(...savedPos);
        camera.rotation.set(...savedRotation);

        setPosition(savedPos);
        setRotation(savedRotation);
    };

    const { type } = useControls("camera", {
        type: {
            options: ["Orbit", "Map"],
            value: safeJSONParse(localStorage.getItem("r3f/cameraType")) || "Map",
        },
        "Save position": button(() => {
            setPosition(camera.position.toArray());
            setRotation(camera.rotation.toArray() as Rotation);
            successToast({ title: "Saved camera position !", description: camera.position.toArray().join(",") });
        }),
        "Go to saved position": button(goToSavedPos),
        "Reset to initial": button(() => {
            camera.position.set(...initialCameraPosition);
            setPosition(initialCameraPosition);
            setRotation([0, 0, 0]);
        }),
    });

    // Set camera position/rotation from localStorage
    useEffect(() => {
        goToSavedPos();
    }, []);

    // Persist type to localStorage onChange
    useEffect(() => {
        if (!type) return;
        setType(safeJSONParse(type));
    }, [type]);

    const Component = type === "Orbit" ? OrbitControls : MapControls;

    return (
        <Component
            ref={controls}
            args={[camera, domElement]}
            enableZoom={true}
            maxPolarAngle={Math.PI}
            minPolarAngle={0}
        />
    );
};
