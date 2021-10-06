import { Debug, useBox } from "@react-three/cannon";
import { useControls } from "leva";
import { useState } from "react";

import { useKey } from "@/functions/useKey";

import { GravityProvider, useControllableGravity, useGravityContext } from "./Gravity";
import { Ground } from "./Ground";
import { PlayerBox } from "./PlayerBox";
import { Trampoline } from "./Trampoline";

export function AppWorld() {
    const [count, setCount] = useState(0);
    useKey("r", () => {
        setCount((current) => current + 1);
        console.clear();
    });

    const { gravity, isPaused, isReversed } = useControllableGravity({ folderName: "localGravity" });
    const { areGravitySync } = useControls({ areGravitySync: false });
    const rootGravity = useGravityContext();

    return (
        <group ref={group} key={count}>
            <Debug>
                <Ground size={[20, 0.1, 20]} />
            </Debug>
            <Trampoline position={[3, 1, 0]} color="yellow" />
            <GravityProvider
                gravity={gravity}
                isPaused={areGravitySync ? isPaused || rootGravity.isPaused : isPaused}
                isReversed={areGravitySync ? isReversed || rootGravity.isPaused : isReversed}
            >
                <PlayerBox />
                <Trampoline position={[0, -3.8, 1]} color="yellow" />
                <Trampoline position={[0, -3.8, 3]} color="yellow" />
                <Trampoline position={[0, -3.8, 5]} color="yellow" />
            </GravityProvider>
        </group>
    );
}
