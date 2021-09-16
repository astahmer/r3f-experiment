import { useConst, useEventListener } from "@chakra-ui/hooks";
import { makeArrayOf, updateAtIndex, updateItem } from "@pastable/utils";
import { a, useSpring } from "@react-spring/three";
import { PublicApi, Triplet, useBox, usePlane } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useMachine } from "@xstate/react";
import { useEffect, useRef, useState } from "react";
import { DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector2, Vector3 } from "three";

import { useKey, useKeyControls } from "@/functions/useKey";
import { AnyState, getFinalStatesPath, printFinalStatesPath } from "@/functions/xstate-utils";

import { getPlayerMachine } from "../functions/playerMachine";

const initialPosT = [0, 0, 0.5] as Triplet;

export const PlayerBox = () => {
    const controls = useKeyControls();
    useKey("r", () => {
        api.velocity.set(0, 0, 0);
        api.position.set(0, 0, 0);
    });

    const [box, api] = useBox(() => ({
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

    useKey("Space", () => send("JUMP"));
    useFrame(() => {
        if (controls.anyDir) send("SET_DIR");
        if (controls.keys.has("ShiftLeft")) return send("DASH");
        if (controls.anyDir) send("MOVE");
    });
    console.log(printFinalStatesPath(state), state.context.current);

    return (
        <a.mesh ref={box} material={getMaterial(state)}>
            <boxGeometry args={[1, 1, 1]} />
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

const useVelocity = (api: PublicApi, initialPos: Triplet = [0, 0, 0]) => {
    const vRef = useRef<Triplet>(initialPos);
    const vel = useConst<Vector3>((() => new Vector3(...initialPos)) as any);

    useEffect(() => api.velocity.subscribe((v) => (vRef.current = v)), []);
    useFrame(() => vel.set(...vRef.current));

    return vel;
};

const red = new MeshStandardMaterial({ name: "red", color: "red" });
const blue = new MeshStandardMaterial({ name: "blue", color: "blue" });
const green = new MeshStandardMaterial({ name: "green", color: "green" });
const white = new MeshStandardMaterial({ name: "white", color: "white" });
const yellow = new MeshStandardMaterial({ name: "yellow", color: "yellow" });
const black = new MeshStandardMaterial({ name: "black", color: "black" });

const basicMaterial = [white, white, white, white, white, white];
// axesHelper -> bleu vers le bas, jaune vers la droite
// cube faces: [droite, gauche, haut, bas, devant, derriere]
// const debugMaterial = [white, blue, green, black, yellow, red];

export const Ground = () => {
    // const ref = useRef<Mesh>(null);
    const [ref] = usePlane(() => ({
        type: "Static",
        position: [0, -5, 0],
        rotation: [-Math.PI / 2, 0, 0],
        material: { friction: 0 },
    }));

    return (
        <mesh ref={ref}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="black" side={DoubleSide} />
        </mesh>
    );
};
