import { Triplet, usePlane } from "@react-three/cannon";
import { DoubleSide } from "three";

export function Ground({ size = [20, 20] }: { size?: [x: number, y: number] }) {
    const [ref] = usePlane(() => ({
        type: "Static",
        args: size,
        position: [0, -5, 0],
        rotation: [-Math.PI / 2, 0, 0],
        material: { friction: 0 },
    }));

    return (
        <mesh ref={ref}>
            <planeGeometry args={size} attach="geometry" />
            <meshStandardMaterial attach="material" color="blue" />
        </mesh>
    );
}
