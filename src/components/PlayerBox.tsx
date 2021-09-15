import { useConst, useEventListener } from "@chakra-ui/hooks";
import { animated, useSpring } from "@react-spring/three";
import { Triplet, useBox, usePlane } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { DoubleSide, Mesh, Vector2, Vector3 } from "three";

import { useKey, useKeyControls } from "@/useKey";

const initialPosT = [0, 0, 0.5] as Triplet;
const initialPosV = new Vector3(...initialPosT);
const settings = { speed: 30, force: 70, jumpForce: 1000, dashDuration: 300, dashCd: 500 };

export const PlayerBox = () => {
    const controls = useKeyControls();
    useKey("r", () => {
        api.velocity.set(0, 0, 0);
        api.position.set(0, 0, 0);
    });
    // const pos = useConst<Vector3>((() => initialPos.clone()) as any);
    // const ref = useRef<Mesh>(null);
    console.log("render");

    const [ref, api] = useBox(() => ({
        mass: 100,
        angularDamping: 1,
        angularVelocity: [1, 1, 1],
        linearDamping: 0.99,
        // linearFactor: [0.1, 1, 0.1],
        material: { friction: 0 },
        onCollideBegin: (e) => (isGroundedRef.current = true),
        onCollideEnd: (e) => (isGroundedRef.current = false),
    }));
    const vRef = useRef<Triplet>([0, 0, 0]);
    const vel = useConst<Vector3>((() => initialPosV.clone()) as any);
    useEffect(() => {
        return api.velocity.subscribe((v) => (vRef.current = v));
    }, []);

    const canDashRef = useRef(true);
    const [isDashing, setDashing] = useState(false);
    const isGroundedRef = useRef(false);

    useFrame((frame, delta) => {
        // const offset = 0.02 * playerSpeed;
        const [vx, vy, vz] = vRef.current;
        vel.set(vx, vy, vz);

        // Set direction
        if (controls.up) vel.setZ(-1 * settings.speed);
        if (controls.down) vel.setZ(1 * settings.speed);
        if (controls.left) vel.setX(-1 * settings.speed);
        if (controls.right) vel.setX(1 * settings.speed);

        // Dash in direction
        if (controls.keys.has("ShiftLeft") && canDashRef.current) {
            setDashing(true);
            canDashRef.current = false;

            setTimeout(() => setDashing(false), settings.dashDuration);
            setTimeout(() => (canDashRef.current = true), settings.dashCd);

            // Normalize so that the distance dashed will be the same even if going into X+Y dir at the same time
            api.applyImpulse(
                vel

                    .normalize()
                    .multiplyScalar(settings.force * 50)
                    .toArray(),
                ref.current.position.toArray()
            );
            return;
        }

        // if (controls.space) vel.setY(40);
        // Jump
        if (controls.space && isGroundedRef.current) {
            api.applyImpulse([vel.x, settings.jumpForce, vel.z], ref.current.position.toArray());
        }

        // Move in direction
        if (controls.anyDir) {
            api.applyImpulse(vel.toArray(), ref.current.position.toArray());
            // api.velocity.set(...vel.toArray());
            // console.log(...controls.keys.values());
        }
    });

    return (
        <animated.mesh ref={ref}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={isDashing ? "yellow" : "red"} />
        </animated.mesh>
    );
};

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
