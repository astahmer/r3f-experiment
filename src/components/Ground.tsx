import { Triplet, useBox } from "@react-three/cannon";

export function Ground({ size = [20, 0.1, 3] }: { size?: Triplet }) {
    const [ref] = useBox(() => ({
        type: "Static",
        args: size,
        position: [0, -5, 0],
        material: { friction: 0 },
    }));

    return (
        <mesh ref={ref} name="ground">
            <boxGeometry args={size} />
            <meshStandardMaterial color="blue" />
        </mesh>
    );
}
