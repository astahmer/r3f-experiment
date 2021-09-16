import { useConst, useEventListener } from "@chakra-ui/hooks";
import { makeArrayOf, updateAtIndex, updateItem } from "@pastable/utils";
import { a, useSpring } from "@react-spring/three";
import { PublicApi, Triplet, useBox } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useMachine } from "@xstate/react";
import { MutableRefObject, useEffect, useState } from "react";
import { Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector2, Vector3 } from "three";
import { DoubleSide } from "three";

import { useKey, useKeyControls } from "@/functions/useKey";
import { useMassRef, useVelocity } from "@/functions/useVelocity";
import { AnyState, getFinalStatesPath, printFinalStatesPath } from "@/functions/xstate-utils";

import { getPlayerMachine } from "../functions/playerMachine";
import { useGravity } from "./Gravity";

const initialPosT = [0, 0, 0.5] as Triplet;

export const PlayerBox = () => {
    const controls = useKeyControls();
    useKey("t", () => {
        api.velocity.set(0, 0, 0);
        api.position.set(0, 0, 0);
    });

    const [box, api] = useBox(() => ({
        // mass: 0.5,
        mass: 100,
        angularDamping: 1,
        angularVelocity: [1, 1, 1],
        linearDamping: 0.99,
        material: { friction: 0 },
        onCollideBegin: (e) => send("SET_GROUNDED", { isGrounded: true }),
        onCollideEnd: (e) => send("SET_GROUNDED", { isGrounded: false }),
    }));
    const vel = useVelocity(api, initialPosT);
    const [state, send] = useMachine(() => getPlayerMachine({ box, api, vel, controls }));

    useGravity({ api });
    useKey("Space", () => send("JUMP"));
    useFrame(() => {
        if (controls.anyDir) send("SET_DIR");
        if (controls.keys.has("ShiftLeft")) return send("DASH");
        if (controls.anyDir) send("MOVE");
    });
    console.log(printFinalStatesPath(state), state.context.current);

    return (
        <a.mesh ref={box} material={getMaterial(state)}>
            <boxGeometry args={[1, 1, 1]} attach="geometry" />
        </a.mesh>
    );
};

const getMaterial = (state: AnyState) => {
    const material = [...basicMaterial];
    if (state.matches("move.idle.canDash")) updateSides(material, green);
    if (state.matches("move.dashing")) updateSides(material, blue);
    if (state.matches("move.idle.exhausted")) updateSides(material, red);

    if (state.matches("jump.grounded")) updateTop(material, green);
    if (state.matches("jump.midair")) updateTop(material, white);
    if (state.matches("jump.flying")) updateTop(material, red);

    return material;
};
const updateSides = (arr: any[], update) => {
    arr[0] = update;
    arr[1] = update;
    arr[4] = update;
    arr[5] = update;
    return arr;
};
const updateTop = (arr: any[], update) => {
    arr[2] = update;
    return arr;
};

const red = new MeshStandardMaterial({ name: "red", color: "red" });
const blue = new MeshStandardMaterial({ name: "blue", color: "blue" });
const green = new MeshStandardMaterial({ name: "green", color: "green" });
const white = new MeshStandardMaterial({ name: "white", color: "white" });
const yellow = new MeshStandardMaterial({ name: "yellow", color: "yellow" });
const black = new MeshStandardMaterial({ name: "black", color: "black" });

// axesHelper -> bleu vers le bas, jaune vers la droite
// cube faces: [droite, gauche, haut, bas, devant, derriere]
// const debugMaterial = [white, blue, green, black, yellow, red];
const basicMaterial = [white, white, white, white, white, white];
