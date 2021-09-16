import { Debug, useBox } from "@react-three/cannon";
import { useState } from "react";

import { useKey } from "@/functions/useKey";

import { GravityProvider, useControllableGravity, useGravityContext } from "./Gravity";
import { Ground } from "./Ground";
import { PlayerBox } from "./PlayerBox";
import { Trampoline, TrampolineWithGravity } from "./Trampoline";

export function AppWorld() {
    const [count, setCount] = useState(0);
    useKey("r", () => setCount((current) => current + 1));

    const [group, api] = useBox(() => ({ args: [0, 0, 0] }));
    const { gravity, isPaused, isReversed } = useControllableGravity({ folderName: "localGravity" });
    const rootGravity = useGravityContext();
    console.log({ gravity, isPaused, isReversed }, rootGravity);

    return (
        <group ref={group} key={count}>
            <Debug>
                <Ground size={[20, 20]} />
            </Debug>
            <TrampolineWithGravity position={[3, 1, 0]} />
            <GravityProvider
                gravity={gravity}
                isPaused={isPaused || rootGravity.isPaused}
                isReversed={isReversed || rootGravity.isPaused}
            >
                <TrampolineWithGravity position={[0, 1, -3]} />
                <Trampoline position={[0, 1, 4]} />
                <PlayerBox />
            </GravityProvider>
        </group>
    );
}
