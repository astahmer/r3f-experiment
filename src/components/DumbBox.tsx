import { useBox } from "@react-three/cannon";
import { DoubleSide } from "three";

import { CommonObject } from "@/types";

export function DumbBox({ position = [5, 1, 1], color = "grey" }: CommonObject) {
    const [ref, api] = useBox(() => ({
        type: "Static",
        args: position,
        position,
        mass: 10,
        angularDamping: 1,
        linearDamping: 0.99,
    }));

    return (
        <mesh ref={ref} position={position}>
            <boxGeometry args={position} />
            <meshStandardMaterial color={color} side={DoubleSide} />
        </mesh>
    );
}
