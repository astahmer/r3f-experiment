import { Triplet, useBox } from "@react-three/cannon";
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

export const TrampolineWithGravity = ({
    position = [5, 1, 1],
    color = "yellow",
}: {
    position?: Triplet;
    color?: string;
}) => {
    const [ref, api] = useBox(() => ({
        args: [5, 1, 1],
        position,
        mass: 10,
        angularDamping: 1,
        linearDamping: 0.99,
    }));
    useGravity({ api });

    // bouncy = material.restitution ++, friction = 0

    return (
        <mesh ref={ref}>
            <boxGeometry args={[5, 1, 1]} />
            <meshStandardMaterial color={color} side={DoubleSide} />
        </mesh>
    );
};
