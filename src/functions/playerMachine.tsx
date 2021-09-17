import { PublicApi } from "@react-three/cannon";
import { MutableRefObject } from "react";
import { Object3D, Vector3 } from "three";
import { createMachine } from "xstate";

import { useKeyControls } from "./useKey";

export const getPlayerMachine = ({
    box,
    api,
    vel,
    controls,
}: {
    box: MutableRefObject<Object3D>;
    api: PublicApi;
    vel: Vector3;
    controls: ReturnType<typeof useKeyControls>;
}) =>
    createMachine(
        {
            context: { current: { jumpCount: 0 } },
            type: "parallel",
            states: {
                move: {
                    id: "move",
                    initial: "idle",
                    states: {
                        idle: {
                            id: "idle",
                            initial: "canDash",
                            states: {
                                canDash: {
                                    on: {
                                        DASH: { target: "#move.dashing", actions: "dash" },
                                    },
                                },
                                exhausted: {
                                    after: { [settings.dashCd - settings.dashDuration]: "canDash" },
                                },
                            },
                        },
                        dashing: {
                            after: { [settings.dashDuration]: "idle.exhausted" },
                        },
                    },
                    on: {
                        SET_DIR: { actions: "setDirection" },
                        MOVE: { actions: "move" },
                    },
                },
                jump: {
                    id: "jump",
                    initial: "grounded",
                    states: {
                        grounded: {
                            initial: "canJump",
                            states: {
                                exhausted: { after: { [settings.jumpCd]: "canJump" } },
                                canJump: {
                                    on: {
                                        JUMP: { target: "#jump.midair", actions: ["incrementJumpCount", "jump"] },
                                    },
                                },
                            },
                        },
                        midair: {
                            initial: "exhausted",
                            states: {
                                exhausted: { after: { [settings.doubleJumpCd]: "canDoubleJump" } },
                                canDoubleJump: {
                                    on: {
                                        JUMP: [
                                            {
                                                target: "canFly",
                                                cond: "canDoubleJump",
                                                actions: ["incrementJumpCount", "doubleJump"],
                                            },
                                        ],
                                    },
                                },
                                canFly: {
                                    initial: "canFly",
                                    states: {
                                        canFly: {
                                            on: {
                                                JUMP: { target: "flying", actions: "fly" },
                                            },
                                        },
                                        flying: {
                                            after: { [settings.flyCd]: "canFly" },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    on: {
                        SET_GROUNDED: [
                            { target: "jump.grounded", cond: "isGrounded", actions: "resetJumpCount" },
                            { target: "jump.midair" },
                        ],
                    },
                },
            },
        },
        {
            actions: {
                setDirection: (ctx, event) => {
                    // Set direction
                    if (controls.up) vel.setZ(-1 * settings.speed);
                    if (controls.down) vel.setZ(1 * settings.speed);
                    if (controls.left) vel.setX(-1 * settings.speed);
                    if (controls.right) vel.setX(1 * settings.speed);
                },
                move: (ctx, event) => {
                    api.applyImpulse(vel.toArray(), box.current.position.toArray());
                },
                incrementJumpCount: (ctx, event) => ctx.current.jumpCount++,
                jump: (ctx, event) => {
                    api.applyImpulse([vel.x, settings.jumpForce, vel.z], box.current.position.toArray());
                },
                doubleJump: (ctx, event) => {
                    api.applyImpulse([vel.x, settings.jumpForce * 0.75, vel.z], box.current.position.toArray());
                },
                fly: (ctx, event) => {
                    api.applyImpulse([vel.x, settings.jumpForce * 0.33, vel.z], box.current.position.toArray());
                },
                resetJumpCount: (ctx, event) => (ctx.current.jumpCount = 0),
                dash: (ctx, event) => {
                    // Normalize so that the distance dashed will be the same even if going into X+Y dir at the same time
                    api.applyImpulse(
                        vel
                            .normalize()
                            .multiplyScalar(settings.force * 50)
                            .toArray(),
                        box.current.position.toArray()
                    );
                },
            },
            guards: {
                isGrounded: (ctx, event) => event.isGrounded,
                canDoubleJump: (ctx, event) => ctx.current.jumpCount === 1 && vel.y < 3,
            },
        }
    );

const settings = {
    speed: 30,
    force: 70,
    jumpForce: 3000,
    dashDuration: 300,
    dashCd: 500,
    jumpCd: 0,
    doubleJumpCd: 100,
    flyCd: 150,
};