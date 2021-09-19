import { Triplet, useBox } from "@react-three/cannon";
import { DoubleSide } from "three";

export function DumbBox({ position = [5, 1, 1], color = "grey" }: { position?: Triplet; color?: string }) {
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
