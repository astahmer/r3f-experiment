import { makeArrayOf } from "@pastable/utils";
import { Debug } from "@react-three/cannon";
import { useControls } from "leva";
import { useState } from "react";

import { useKey } from "@/functions/useKey";
import { CommonObject } from "@/types";

import { DumbBox } from "./DumbBox";
import { GravityProvider, useControllableGravity, useGravityContext } from "./Gravity";
import { Ground } from "./Ground";
import { Pack } from "./Pack";
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
            {/* <Trampoline position={[3, 1, 0]} color="yellow" /> */}
            {/* <Launchpad position={[0, -4.75, -3]} color="cyan" angle={Math.PI / 2} type="fixed" />
            <Launchpad position={[4, -4.75, -1]} color="grey" angle={Math.PI} type="continuous" />
            <Launchpad position={[4, -4.75, 1]} color="purple" angle={0} type="forwards" />
            <Launchpad position={[-2, -4.75, -2]} color="pink" angle={-Math.PI / 2} type="forwards" /> */}
            <Arena width={15} />
            <WallMap
                position={[-5, -5 + wallHeight / 2 + groundHeight, -5]}
                wallMap={[
                    [0, 0],
                    [0, 1],
                    [0, 2],
                    [0, 3],
                    [1, 0],
                    [2, 1],
                    [3, 2],
                    [4, 3],
                ]}
                color="orange"
            />
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

// TODO context/props ?
const wallWidth = 1;
const wallHeight = 3;
const groundHeight = 0.1;

const Wall = (props: CommonObject & { wireframe?: boolean }) => (
    <DumbBox size={[wallWidth, wallHeight, wallWidth]} color="cyan" {...props} />
);
const Arena = ({ width = 20 }: { width?: number }) => {
    const offset = -width / 2 + wallWidth / 2;

    return (
        <Pack position={[0, -5, 0]}>
            <Debug>
                <Ground position={[0, 0, 0]} size={[width, groundHeight, width]} />
            </Debug>
            <Pack position={[offset, wallHeight / 2 + groundHeight, offset]}>
                <Wall position={[0, 0, 0]} color="salmon" wireframe={false} />
                <Wall position={[width - 1, 0, 0]} color="green" wireframe={false} />
                <Wall position={[0, 0, width - 1]} color="blue" wireframe={false} />
                <Wall position={[width - 1, 0, width - 1]} color="yellow" wireframe={false} />
                {makeArrayOf(width - 1).map((_, i) => (
                    <Wall key={i} position={[0, 0, i]} />
                ))}
                {makeArrayOf(width - 1).map((_, i) => (
                    <Wall key={i} position={[i, 0, 0]} />
                ))}
                {makeArrayOf(width - 1).map((_, i) => (
                    <Wall key={i} position={[0 + i, 0, width - 1]} />
                ))}
                {makeArrayOf(width - 1).map((_, i) => (
                    <Wall key={i} position={[width - 1, 0, 0 + i]} />
                ))}
            </Pack>
        </Pack>
    );
};

const WallMap = ({
    position,
    color,
    wallMap,
}: { wallMap: Array<[x: number, y: number]> } & Pick<CommonObject, "position" | "color">) => {
    return (
        <Pack position={position}>
            {wallMap.map(([x, y], i) => (
                <Wall key={x + "," + y + "-" + i} position={[x, 0, y]} color={color} />
            ))}
        </Pack>
    );
};
