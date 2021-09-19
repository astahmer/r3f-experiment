import { a } from "@react-spring/three";
import { Triplet, useBox } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useMachine } from "@xstate/react";
import { useUpdateAtom } from "jotai/utils";
import { useEffect, useMemo } from "react";
import { MeshStandardMaterial, Object3D } from "three";

import { playerFinalStatesPathAtom } from "@/functions/store";
import { useKey, useKeyControls } from "@/functions/useKey";
import { useVelocity } from "@/functions/useVelocity";
import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";

import { getPlayerMachine } from "../functions/playerMachine";
import { PlayerCompass } from "./Compass";
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
        material: { friction: 0, restitution: 0.1 },
        onCollideBegin: (e) => {
            const dirs = getCollideDirections(e.target, e.body);
            if (dirs.y === "bottom") {
                send("SET_GROUNDED", { isGrounded: true });
            }
        },
    }));
    const vel = useVelocity(api, { initial: initialPosT });
    const [state, send, service] = useMachine(() => getPlayerMachine({ box, api, vel, controls }));

    useGravity({ api });
    useKey("Space", () => {
        send("JUMP");
        send("SET_GROUNDED", { isGrounded: false });
    });
    useKey("r", () => service.start());
    useFrame(() => {
        if (controls.anyDir) send("SET_DIR");
        if (controls.keys.has("ShiftLeft")) return send("DASH");
        if (controls.anyDir) send("MOVE");
    });

    const updatePlayerFinalStatesPath = useUpdateAtom(playerFinalStatesPathAtom);
    const finalStatesPath = useMemo(() => printFinalStatesPath(state), [state]);
    useEffect(() => {
        updatePlayerFinalStatesPath(finalStatesPath);
    }, [finalStatesPath]);

    return (
        <a.mesh name="player" ref={box} material={getMaterial(state)}>
            <boxGeometry args={[1, 1, 1]} />
            <PlayerCompass />
        </a.mesh>
    );
};

const getCollideDirections = (selfTarget: Object3D, bodyInContactWith: Object3D) => {
    const targetPos = selfTarget.getWorldPosition(selfTarget.position.clone());
    const bodyPos = bodyInContactWith.getWorldPosition(bodyInContactWith.position.clone());

    const diff = targetPos.clone().sub(bodyPos);
    const x = diff.x === 0 ? undefined : diff.x > 0 ? "left" : "right";
    const y = diff.y === 0 ? undefined : diff.y > 0 ? "bottom" : "top";
    const z = diff.z === 0 ? undefined : diff.z > 0 ? "front" : "back";

    return { diff, x, y, z };
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
