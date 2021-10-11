import { safeJSONParse } from "@pastable/utils";
import { Triplet } from "@react-three/cannon";
import { MapControls, MapControlsProps, OrbitControls, OrbitControlsProps, TrackballControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { atom } from "jotai";
import { atomWithStorage, useAtomValue, useUpdateAtom } from "jotai/utils";
import { buttonGroup, useControls } from "leva";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

import { Gizmo } from "@/components/Gizmo";
import { successToast } from "@/functions/toasts";
import { useArrayCursor } from "@/functions/useArrayCursor";
import { useKey } from "@/functions/useKey";

type Rotation = Parameters<THREE.Euler["set"]>;
const initialCameraPosition = [0, 6, 10] as Triplet;
const initialRelativeCameraPosition = [0, 4, 7] as Triplet;
const initialCameraType = "Orbit";

export const cameraPosAtom = atomWithStorage("r3f/cameraPos", initialCameraPosition);
export const cameraRotationAtom = atomWithStorage("r3f/cameraRotation", [0, 0, 0, "XYZ"] as Rotation);
export const cameraTypeAtom = atomWithStorage("r3f/cameraType", initialCameraType);

export const cameraRelativePosAtom = atomWithStorage("r3f/cameraRelativePos", initialRelativeCameraPosition);
export const cameraControlsAtom = atom(null as OrbitControlsProps | MapControlsProps);
export const cameraTargetRefAtom = atom({ current: [0, 0, 0] as Triplet });

export const CameraControls = () => {
    const camera = useThree((state) => state.camera);
    const domElement = useThree((state) => state.gl.domElement);

    const controls = useRef<OrbitControlsProps | MapControlsProps>(null);
    const cameraTargetRef = useAtomValue(cameraTargetRefAtom);

    // Update target from ref (set from Player position)
    useFrame(() => {
        (controls.current.target as Vector3).set(...cameraTargetRef.current);
        const [x, y, z] = cameraTargetRef.current;
        set({ targetPosition: { x, y, z } });
        controls.current.update();
    });

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

    const [{ type, speed }, set] = useControls("camera", () => ({
        type: {
            options: cameraTypes,
            value: safeJSONParse(localStorage.getItem("r3f/cameraType")) || initialCameraType,
            onChange: setType,
            transient: false,
        },
        speed: 250,
        relativePos: {
            ...getRelativeCameraPosFromLocalStorage(),
            onChange: (update) => setRelativePos(Object.values(update) as Triplet),
            transient: false,
        } as any,
        targetPosition: { x: 0, y: 0, z: 0, disabled: true } as any,
        position: buttonGroup({
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

    // Set camera position/rotation from localStorage
    useEffect(() => {
        goToSavedPos();
    }, []);

    const Component =
        type === "Orbit" || type === "Free"
            ? OrbitControls
            : type === "Map"
            ? MapControls
            : type === "Perspective"
            ? TrackballControls
            : null;

    const setCameraControls = useUpdateAtom(cameraControlsAtom);

    return (
        <>
            {Component ? (
                <Component
                    ref={(ref) => {
                        controls.current = ref;
                        setCameraControls(ref);
                    }}
                    args={[camera, domElement]}
                    enableZoom={true}
                    maxPolarAngle={Math.PI}
                    minPolarAngle={0}
                    keyPanSpeed={speed}
                />
            ) : null}
            <Gizmo />
        </>
    );
};

const cameraTypes = ["Orbit", "Free"];
const getRelativeCameraPosFromLocalStorage = () => {
    const [x, y, z] = safeJSONParse(localStorage.getItem("r3f/cameraRelativePos")) || initialRelativeCameraPosition;
    return { x, y, z } as { x: number; y: number; z: number };
};

const useCameraWithArrowKeys = () => {
    const domElement = useThree((state) => state.gl.domElement);
    const cameraControls = useAtomValue(cameraControlsAtom);

    // Enable arrow keys to move the camera
    useEffect(() => {
        if (!(domElement && cameraControls?.listenToKeyEvents)) return;
        domElement.setAttribute("tabIndex", "0");
        cameraControls.listenToKeyEvents(domElement);
    }, []);
};
