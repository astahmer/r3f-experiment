import { useBox } from "@react-three/cannon";

import { CollisionGroup } from "@/functions/store";
import { CommonObject } from "@/types";

export function Ground({ color = "salmon", size = [20, 0.1, 3] }: CommonObject) {
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
            <meshStandardMaterial color={color} />
        </mesh>
    );
}
