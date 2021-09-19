import { Triplet, useBox } from "@react-three/cannon";

import { CollisionGroup } from "@/functions/store";

export function Ground({ size = [20, 0.1, 3] }: { size?: Triplet }) {
    const [ref] = useBox(() => ({
        type: "Static",
        args: size,
        position: [0, -5, 0],
        material: { friction: 0 },
        collisionFilterGroup: CollisionGroup.GROUND,
    }));

    return (
        <mesh ref={ref} name="ground">
            <boxGeometry args={size} />
            <meshStandardMaterial color="blue" />
        </mesh>
    );
}
