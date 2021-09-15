import { useConst, useEventListener } from "@chakra-ui/hooks";
import { makeArrayOf } from "@pastable/utils";
import { animated, useSpring } from "@react-spring/three";
import { PublicApi, Triplet, useBox, usePlane } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector2, Vector3 } from "three";

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

    const [ref, api] = useBox(() => ({
        mass: 100,
        angularDamping: 1,
        angularVelocity: [1, 1, 1],
        linearDamping: 0.99,
        material: { friction: 0 },
        onCollideBegin: (e) => (isGroundedRef.current = true),
        onCollideEnd: (e) => (isGroundedRef.current = false),
    }));
    const vel = useVelocity(api);

    const [isDashing, setDashing] = useState(false);
    const [canDash, setCanDash] = useState(true);
    const isGroundedRef = useRef(false);

    useFrame((frame, delta) => {
        // Set direction
        if (controls.up) vel.setZ(-1 * settings.speed);
        if (controls.down) vel.setZ(1 * settings.speed);
        if (controls.left) vel.setX(-1 * settings.speed);
        if (controls.right) vel.setX(1 * settings.speed);

        // Dash in direction
        if (controls.anyDir && controls.keys.has("ShiftLeft") && canDash) {
            setDashing(true);
            setCanDash(false);

            setTimeout(() => setDashing(false), settings.dashDuration);
            setTimeout(() => setCanDash(true), settings.dashCd);

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

        // Jump
        if (controls.space && isGroundedRef.current) {
            api.applyImpulse([vel.x, settings.jumpForce, vel.z], ref.current.position.toArray());
        }

        // Move in direction
        if (controls.anyDir) {
            api.applyImpulse(vel.toArray(), ref.current.position.toArray());
        }
    });

    return (
        <animated.mesh ref={ref} material={isDashing ? dashingMaterial : canDash ? basicMaterial : canDashMaterial}>
            <boxGeometry args={[1, 1, 1]} />
        </animated.mesh>
    );
};

const useVelocity = (api: PublicApi, initialPos: Triplet = [0, 0, 0]) => {
    const vRef = useRef<Triplet>(initialPos);
    const vel = useConst<Vector3>((() => new Vector3(...initialPos)) as any);

    useEffect(() => api.velocity.subscribe((v) => (vRef.current = v)), []);
    useFrame(() => {
        const [vx, vy, vz] = vRef.current;
        vel.set(vx, vy, vz);
    });

    return vel;
};

const red = new MeshStandardMaterial({ color: "red" });
const blue = new MeshStandardMaterial({ color: "blue" });
const green = new MeshStandardMaterial({ color: "green" });

const basicMaterial = [red, red, red, red, red, red];
const dashingMaterial = [red, red, blue, red, red, red];
const canDashMaterial = [red, red, green, red, red, red];

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
