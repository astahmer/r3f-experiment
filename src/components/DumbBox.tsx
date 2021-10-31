import { useMergeRefs } from "@chakra-ui/hooks";
import { BoxGeometry, DoubleSide, Mesh, MeshStandardMaterial } from "three";

import { CommonObject } from "@/types";

import { useObject } from "./Pack";

export function DumbBox({
    size,
    position = [5, 1, 1],
    color = "grey",
    wireframe = true,
    meshRef,
    render,
}: CommonObject) {
    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={size || position} />
            <meshStandardMaterial color={color} side={DoubleSide} wireframe={wireframe} />
            {render?.()}
        </mesh>
    );
}

export function PhysicsBox({
    size,
    position = [5, 1, 1],
    color = "grey",
    wireframe = true,
    meshRef,
    render,
}: CommonObject) {
    // TODO get default props from pack provider ?
    const [ref, api] = useObject(() => ({
        type: "Static",
        args: size || position,
        position,
        mass: 10,
        angularDamping: 1,
        linearDamping: 0.99,
    }));

    return (
        <mesh ref={useMergeRefs(ref, meshRef)} position={position}>
            <boxGeometry args={size || position} />
            <meshStandardMaterial color={color} side={DoubleSide} wireframe={wireframe} />
            {render?.()}
        </mesh>
    );
}

export type DumbBoxMesh = Mesh<BoxGeometry, MeshStandardMaterial>;
