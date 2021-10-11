import { CollisionGroup } from "@/functions/store";
import { CommonObject } from "@/types";

import { useObject } from "./Pack";

export function Ground({ color = "salmon", position, size = [20, 0.1, 3] }: CommonObject) {
    const [ref] = useObject(() => ({
        type: "Static",
        args: size,
        position,
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
