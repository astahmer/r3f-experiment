import { safeJSONParse } from "@pastable/utils";
import { Triplet } from "@react-three/cannon";
import { MapControls, MapControlsProps, OrbitControls, OrbitControlsProps } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { atomWithStorage, useUpdateAtom } from "jotai/utils";
import { button, buttonGroup, useControls } from "leva";
import { useEffect, useRef } from "react";

import { successToast } from "@/functions/toasts";
import { useArrayCursor } from "@/functions/useArrayCursor";
import { useKey } from "@/functions/useKey";

type Rotation = Parameters<THREE.Euler["set"]>;
const initialCameraPosition = [0, 6, 10] as Triplet;
export const cameraPosAtom = atomWithStorage("r3f/cameraPos", initialCameraPosition);
export const cameraRotationAtom = atomWithStorage("r3f/cameraRotation", [0, 0, 0, "XYZ"] as Rotation);
export const cameraTypeAtom = atomWithStorage("r3f/cameraType", "Map");
export const cameraRelativePosAtom = atomWithStorage("r3f/cameraRelativePos", [0, 4, 7]);

export const CameraControls = () => {
    const {
        camera,
        gl: { domElement },
    } = useThree();

    const controls = useRef<OrbitControlsProps | MapControlsProps>(null);

    const setPosition = useUpdateAtom(cameraPosAtom);
    const setRotation = useUpdateAtom(cameraRotationAtom);
    const setType = useUpdateAtom(cameraTypeAtom);
    const setRelativePos = useUpdateAtom(cameraRelativePosAtom);

    const goToSavedPos = () => {
        const savedPos = safeJSONParse<Triplet>(localStorage.getItem("r3f/cameraPos"));
        if (!savedPos) return;

        const savedRotation = safeJSONParse<Rotation>(localStorage.getItem("r3f/cameraRotation"));
        if (!savedRotation) return;

        camera.position.set(...savedPos);
        camera.rotation.set(...savedRotation);

        setPosition(savedPos);
        setRotation(savedRotation);
    };

    const [{ type, speed, relativePos }, set] = useControls("camera", () => ({
        type: {
            options: cameraTypes,
            value: safeJSONParse(localStorage.getItem("r3f/cameraType")) || "Map",
        },
        speed: 250,
        relativePos: { x: 0, y: 0, z: 0 },
        position: buttonGroup({
            // label: "Position group",
            opts: {
                Save: () => {
                    setPosition(camera.position.toArray());
                    setRotation(camera.rotation.toArray() as Rotation);
                    successToast({
                        title: "Saved camera position !",
                        description: camera.position.toArray().join(","),
                    });
                },
                "Go to saved": goToSavedPos,
                "Reset to initial": () => {
                    camera.position.set(...initialCameraPosition);
                    setPosition(initialCameraPosition);
                    setRotation([0, 0, 0]);
                },
            },
        }),
    }));

    // Loop over camera types
    const [cursorIndex, cursor] = useArrayCursor(
        cameraTypes.length,
        cameraTypes.findIndex((item) => item === type)
    );
    useKey("c", () => cursor.next());
    useEffect(() => {
        set({ type: cameraTypes[cursorIndex] });
    }, [cursorIndex]);

    // Update camera type atom on useControls.type.change
    useEffect(() => {
        setType(type);
    }, [type]);

    // Update camera type atom on useControls.type.change
    useEffect(() => {
        setRelativePos(Object.values(relativePos));
    }, [relativePos]);

    // Set camera position/rotation from localStorage
    useEffect(() => {
        goToSavedPos();
    }, []);

    // Persist type to localStorage onChange
    useEffect(() => {
        if (!(domElement && controls.current)) return;
        domElement.setAttribute("tabIndex", "0");
        controls.current.listenToKeyEvents(domElement);

        if (!type) return;
        setType(safeJSONParse(type));
    }, [type]);

    const Component = type === "Orbit" ? OrbitControls : type === "Map" ? MapControls : null;

    return (
        <>
            {Component ? (
                <Component
                    ref={controls as any}
                    args={[camera, domElement]}
                    enableZoom={true}
                    maxPolarAngle={Math.PI}
                    minPolarAngle={0}
                    keyPanSpeed={speed}
                />
            ) : null}
        </>
    );
};

const cameraTypes = ["Orbit", "Map", "Perspective"];
