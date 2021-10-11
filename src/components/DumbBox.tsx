import { DoubleSide } from "three";

import { CommonObject } from "@/types";

import { useObject } from "./Pack";

export function DumbBox({
    size,
    position = [5, 1, 1],
    color = "grey",
    wireframe = true,
}: CommonObject & { wireframe?: boolean }) {
    const [ref, api] = useObject(() => ({
        type: "Static",
        args: size || position,
        position,
        mass: 10,
        angularDamping: 1,
        linearDamping: 0.99,
    }));
    // console.log(position);

    return (
        <mesh ref={ref} position={position}>
            <boxGeometry args={size || position} />
            <meshStandardMaterial color={color} side={DoubleSide} wireframe={wireframe} />
        </mesh>
    );
}
