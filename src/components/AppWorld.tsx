import { Debug, useBox } from "@react-three/cannon";
import { useState } from "react";

import { useKey } from "@/functions/useKey";

import { Gravity, GravityProvider, useControllableGravity } from "./Gravity";
import { Ground } from "./Ground";
import { PlayerBox } from "./PlayerBox";
import { Trampoline, TrampolineWithGravity } from "./Trampoline";

export function AppWorld() {
    const [count, setCount] = useState(0);
    useKey("r", () => setCount((current) => current + 1));

    const [group, api] = useBox(() => ({ args: [0, 0, 0] }));
    const gravity = useControllableGravity();

    return (
        <group ref={group} key={count}>
            <Debug>
                <Ground size={[20, 20]} />
            </Debug>
            <GravityProvider gravity={gravity}>
                <TrampolineWithGravity position={[0, 1, -3]} />
                <Gravity>
                    <Trampoline position={[0, 1, 4]} />
                </Gravity>
                <PlayerBox />
                {/* <Gravity gravity={[0, -40, 0]}>
                    <PlayerBox />
                </Gravity> */}
            </GravityProvider>
        </group>
    );
}
