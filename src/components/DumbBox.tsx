import { useMergeRefs } from "@chakra-ui/hooks";
import { useRef } from "react";
import { BoxGeometry, Color, DoubleSide, Mesh, MeshStandardMaterial } from "three";

import { useKey, useMouseControls } from "@/functions/useKey";
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
    // TODO get default props from pack provider ?
    const [ref, api] = useObject(() => ({
        type: "Static",
        args: size || position,
        position,
        mass: 10,
        angularDamping: 1,
        linearDamping: 0.99,
    }));
    const colorRef = useRef<Color>();
    const clickedColorRef = useRef(0);

    const mouse = useMouseControls();
    const toggle = (e) => {
        const mesh = e.object as DumbBoxMesh;
        if (colors.some((color) => mesh.material.color.equals(color))) {
            mesh.material.color.set(colorRef.current);
            return;
        }

        colorRef.current = mesh.material.color.clone();
        mesh.material.color.set(colors[clickedColorRef.current % colors.length]);
    };

    useKey("n", () => clickedColorRef.current++);

    return (
        <mesh
            ref={useMergeRefs(ref, meshRef)}
            position={position}
            onPointerDown={toggle}
            onPointerOver={(e) => mouse.down && toggle(e)}
        >
            <boxGeometry args={size || position} />
            <meshStandardMaterial color={color} side={DoubleSide} wireframe={wireframe} />
            {render?.()}
        </mesh>
    );
}

const colors = [new Color("red"), new Color("black"), new Color("darkblue"), new Color("darkgreen")];

export type DumbBoxMesh = Mesh<BoxGeometry, MeshStandardMaterial>;
