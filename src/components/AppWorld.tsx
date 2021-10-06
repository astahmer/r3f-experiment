import { Debug, useBox } from "@react-three/cannon";
import { useControls } from "leva";
import { useState } from "react";

import { useKey } from "@/functions/useKey";

import { DumbBox } from "./DumbBox";
import { GravityProvider, useControllableGravity, useGravityContext } from "./Gravity";
import { Ground } from "./Ground";
import { Launchpad } from "./Launchpad";
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
        <group key={count}>
            <Debug>
                <Ground size={[20, 0.1, 20]} />
            </Debug>
            {/* <Trampoline position={[3, 1, 0]} color="yellow" /> */}
            <Launchpad position={[0, -4.75, -3]} color="cyan" angle={Math.PI / 2} type="fixed" />
            <Launchpad position={[4, -4.75, -1]} color="grey" angle={Math.PI} type="continuous" />
            <Launchpad position={[4, -4.75, 1]} color="purple" angle={0} type="forwards" />
            <Launchpad position={[-2, -4.75, -2]} color="pink" angle={-Math.PI / 2} type="forwards" />
            {/* <DumbBox position={[3, 1, 3]} color="cyan" /> */}
            <GravityProvider
                gravity={gravity}
                isPaused={areGravitySync ? isPaused || rootGravity.isPaused : isPaused}
                isReversed={areGravitySync ? isReversed || rootGravity.isPaused : isReversed}
            >
                <PlayerBox />
                {/* <Trampoline position={[0, -3.8, 1]} color="yellow" /> */}
                <Trampoline position={[0, -3.8, 3]} color="yellow" />
                <Trampoline position={[0, -3.8, 5]} color="yellow" />
            </GravityProvider>
        </group>
    );
}
