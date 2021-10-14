import { makeArrayOf } from "@pastable/utils";
import { Debug } from "@react-three/cannon";

import { CommonObject } from "@/types";

import { DumbBox } from "./DumbBox";
import { Ground } from "./Ground";
import { Pack } from "./Pack";

// TODO context/props ?
const wallWidth = 1;
export const wallHeight = 3;
export const groundHeight = 0.1;

export const Wall = (props: CommonObject) => (
    <DumbBox size={[wallWidth, wallHeight, wallWidth]} color="cyan" {...props} />
);
export const Arena = ({ width = 20 }: { width?: number }) => {
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
export const WallMap = ({
    position,
    color,
    wallMap,
}: { wallMap: Array<[x: number, y: number, props?: CommonObject]> } & Pick<CommonObject, "position" | "color">) => {
    return (
        <Pack position={position}>
            {wallMap.map(([x, y, props], i) => (
                <Wall key={x + "," + y + "-" + i} position={[x, 0, y]} color={color} {...props} />
            ))}
        </Pack>
    );
};
