import { PublicApi, Triplet, useBox } from "@react-three/cannon";
import { RefObject, useState } from "react";
import { Euler, Object3D, Vector3 } from "three";
import { State } from "xstate";

import { PlayerMachineContext } from "@/functions/playerMachine";
import { settings } from "@/functions/settings";
import { CollisionGroup } from "@/functions/store";
import { useKey } from "@/functions/useKey";
import { useRotation } from "@/functions/useVelocity";
import { CommonObject } from "@/types";

export const Launchpad = ({
    size = [4, 0.2, 1],
    position,
    // rotation = [0.4, 0, 0],
    angle = 0.4,
    color = "purple",
    type,
}: CommonObject & { type?: LaunchpadType; angle?: number }) => {
    const rotation = [0, angle, 0.4] as Triplet;
    console.log(rotation);

    const [box, api] = useBox(() => ({
        type: "Static",
        args: size,
        position,
        rotation,
        collisionFilterMask: CollisionGroup.PLAYER,
        onCollideBegin: (e) => {
            const { api, state } = e.body.userData as PlayerData;
            const ctx = state.context;

            const vel = ctx.getVelocity();
            const playerRotation = ctx.getRotation();
            const direction = ctx.current.direction as Vector3;

            const impulse = getImpulse({ direction, vel, rotation, playerRotation, type });
            console.log({ direction, vel, rotation, playerRotation, type, impulse });

            api.applyImpulse(impulse, ctx.getPosition());
        },
    }));

    const currentRotation = useRotation(api);
    useKey("m", () => {
        // setRotation((current) => [0, angle + current[1], 0]);
        api.rotation.copy(currentRotation.clone().applyAxisAngle(yAxis, Math.PI / 6));
    });

    return (
        <mesh ref={box} position={position} rotation={rotation}>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};

interface PlayerData {
    box: RefObject<Object3D>;
    api: PublicApi;
    state: State<PlayerMachineContext>;
}

type LaunchpadType = "fixed" | "continuous" | "forwards";
const xAxis = new Vector3(1, 0, 0);
const yAxis = new Vector3(0, 1, 0);
const zAxis = new Vector3(0, 0, 1);
const emptyV = new Vector3(0, 0, 0);

// TODO isReverse = .negate()
function getImpulse({
    direction,
    vel,
    rotation,
    type = "fixed",
    playerRotation,
}: {
    direction: Vector3;
    vel: Vector3;
    rotation: Triplet;
    playerRotation: Vector3;
    type?: LaunchpadType;
}) {
    // Always launch the player in the given fixed direction
    if (type === "fixed") {
        return (
            direction
                .clone()
                .copy(emptyV)
                .addScalar(1)
                .setY(settings.speed)
                .setZ(-settings.speed)
                .normalize()
                // .negate()
                .multiplyScalar(250 * settings.speed)
                .toArray()
        );
    }

    // Always launch the player in the direction he's facing
    if (type === "continuous") {
        return direction
            .clone()
            .copy(vel)
            .applyAxisAngle(yAxis, playerRotation.y)
            .setY(settings.speed)
            .normalize()
            .multiplyScalar(250 * settings.speed)
            .toArray();
    }

    // Always launch the player in the direction forwards that the launchpad is facing
    if (type === "forwards") {
        return (
            xAxis
                .clone()
                .applyAxisAngle(yAxis, rotation[1])
                .setY(1)
                // .negate()
                .normalize()
                .multiplyScalar(250 * settings.speed)
                .toArray()
        );
    }
}
