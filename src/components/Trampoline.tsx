import { useConst } from "@chakra-ui/hooks";
import { Triplet, useBox } from "@react-three/cannon";
import { DoubleSide, Vector3 } from "three";

import { CollisionGroup } from "@/functions/store";
import { usePosition } from "@/functions/useVelocity";

import { useGravity } from "./Gravity";

const mass = 1000;
const bouncingYSizePercent = 0.1;
const bouncingXZSizePercent = 0.9;

export const Trampoline = ({
    position = [5, 1, 1],
    size = [2, 0.4, 2],
    color = "yellow",
}: {
    position?: Triplet;
    size?: Triplet;
    color?: string;
}) => {
    const [x, y, z] = size;
    const bYSize = y * bouncingYSizePercent;
    const bSize = [x * bouncingXZSizePercent, bYSize, z * bouncingXZSizePercent] as Triplet;

    const [baseRef, api] = useBox(() => ({
        angularDamping: 1,
        linearFactor: [0, 1, 0],
        linearDamping: 0.99,
        position,
        args: size,
        mass,
    }));
    useGravity({ api });

    const bPos = useConst((() =>
        new Vector3(...position).add(new Vector3(0, y / 2 + bYSize / 2, 0)).toArray()) as any as Triplet);
    usePosition(api, {
        onUpdate: ([posX, posY, posZ]) => bApi.position.set(posX, posY + y / 2 + bYSize / 2, posZ),
    });

    const [bounce, bApi] = useBox(() => ({
        angularDamping: 1,
        linearFactor: [0, 0, 0],
        position: bPos,
        args: bSize,
        mass,
        material: { restitution: 50 },
        collisionFilterMask: CollisionGroup.PLAYER,
        collisionFilterGroup: CollisionGroup.TRAMPOLINE,
    }));

    return (
        <>
            <mesh ref={baseRef}>
                <boxGeometry args={size} />
                <meshStandardMaterial color={color} side={DoubleSide} />
            </mesh>
            <mesh ref={bounce}>
                <boxGeometry args={bSize} />
                <meshStandardMaterial color={"red"} />
            </mesh>
        </>
    );
};
