import { Triplet, useBox, useCompoundBody } from "@react-three/cannon";
import { useState } from "react";
import { DoubleSide } from "three";

import { useKey } from "@/functions/useKey";

import { useGravity } from "./Gravity";

export function Trampoline({ position = [5, 1, 1], color = "red" }: { position?: Triplet; color?: string }) {
    const [ref, api] = useBox(() => ({
        args: [5, 1, 1],
        position,
        mass: 10,
        angularDamping: 1,
        linearDamping: 0.99,
    }));

    return (
        <mesh ref={ref}>
            <boxGeometry args={[5, 1, 1]} />
            <meshStandardMaterial color={color} side={DoubleSide} />
        </mesh>
    );
}

const mass = 1000;
const bouncingOffset = 0.1;
export const TrampolineWithGravity = ({
    position = [5, 1, 1],
    size = [2, 0.4, 2],
    color = "yellow",
}: {
    position?: Triplet;
    size?: Triplet;
    color?: string;
}) => {
    const [x, y, z] = size;

    const bouncingSizeY = y * 0.1;
    const bouncingPos = [0, y / 2 + bouncingSizeY / 2, 0] as Triplet;
    const bouncingSize = [x / 2, bouncingSizeY, z / 2] as Triplet;

    const [ref, api] = useCompoundBody(() => ({
        mass,
        angularDamping: 1,
        linearFactor: [0, 1, 0],
        linearDamping: 0.99,
        position,
        shapes: [
            {
                type: "Box",
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                args: size,
                mass,
                material: { restitution: 0 },
            },
            {
                type: "Box",
                position: bouncingPos,
                rotation: [0, 0, 0],
                args: bouncingSize,
                mass,
                material: { restitution: 50 },
            },
        ],
    }));

    useGravity({ api });

    return (
        <group ref={ref} position={position}>
            <mesh>
                <boxGeometry args={size} />
                <meshStandardMaterial color={color} side={DoubleSide} />
            </mesh>
            <mesh position={bouncingPos}>
                <boxGeometry args={bouncingSize} />
                <meshStandardMaterial color={"red"} />
            </mesh>
        </group>
    );
};

export function CompoundBody(props) {
    const boxSize = [1, 1, 1] as Triplet;
    const sphereRadius = 0.65;
    const [ref, api] = useCompoundBody(() => ({
        mass: 12,
        position: [-5, 0, 3],
        ...props,
        shapes: [
            { type: "Box", position: [0, 0, 0], rotation: [0, 0, 0], args: boxSize },
            { type: "Sphere", position: [1, 0, 0], rotation: [0, 0, 0], args: [sphereRadius] },
        ],
    }));
    useGravity({ api });

    return (
        <group ref={ref}>
            <mesh castShadow>
                <boxBufferGeometry args={boxSize} />
                <meshNormalMaterial />
            </mesh>
            <mesh castShadow position={[1, 0, 0]}>
                <sphereBufferGeometry args={[sphereRadius, 16, 16]} />
                <meshNormalMaterial />
            </mesh>
        </group>
    );
}
