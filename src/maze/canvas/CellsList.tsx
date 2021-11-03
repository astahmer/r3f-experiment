import { chakra, useMergeRefs } from "@chakra-ui/react";
import { chunk } from "@pastable/utils";
import { Html, Instance, Instances } from "@react-three/drei";
import { Position } from "@react-three/drei/helpers/Position";
import { atom } from "jotai";
import { useAtomValue } from "jotai/utils";
import { MutableRefObject, Ref, useEffect, useRef, useState } from "react";

import { MazeCell, MazeGridType } from "@/maze/mazeGeneratorMachine";
import { CommonObject } from "@/types";

import { colorByDisplayState, geometry, material } from "../utils";

// https://codesandbox.io/s/re-using-gltfs-forked-h8o2d?file=/src/App.js:136-228
export function CellsList({
    maze,
    registerMesh,
}: {
    maze: MazeGridType;
    registerMesh: (cell: MazeCell, node: Position) => void;
}) {
    const list = maze.flat();
    const chunks = chunk(list, 1000); // idk why when using higher limits (ex: 9999) it starts lagging

    return (
        <>
            {chunks.map((chunk, i) => (
                <Instances key={i} range={chunk.length} material={material} geometry={geometry}>
                    {chunk.map((cell, i) => (
                        <CellBox
                            key={i}
                            cell={cell}
                            position={[cell.x, 0, cell.y]}
                            rotation={[0, 0, 0]}
                            instanceRef={(node) => registerMesh(cell, node)}
                            color={colorByDisplayState[cell.display]}
                        />
                    ))}
                </Instances>
            ))}
        </>
    );
}

function CellBox({
    cell,
    position,
    rotation,
    instanceRef,
    color,
}: Omit<CommonObject, "meshRef"> & {
    cell: MazeCell;
    instanceRef?: MutableRefObject<Position> | Ref<Position>;
}) {
    const ref = useRef<Position>();
    // const [hovered, setHover] = useState(false);
    // const hoverColor = useConst(new Color());

    // useFrame(() => {
    //     ref.current.color.lerp(hoverColor.set(hovered ? "red" : color), hovered ? 1 : 0.1);
    // });

    // console.log(position);
    // console.log(index, range);

    return (
        <group {...{ position, rotation }}>
            <Instance
                ref={useMergeRefs(ref, instanceRef)}
                // onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
                // onPointerOut={() => setHover(false)}
            />
            <CellPosition cell={cell} />
        </group>
    );
}

const CellPosition = ({ cell }: { cell: MazeCell }) => {
    const showCellPos = useAtomValue(showCellPosAtom);
    const [shouldRenderHtml, setShouldRenderHtml] = useState(showCellPos);

    useEffect(() => {
        if (showCellPos && !shouldRenderHtml && cell.state && cell.state !== "wall") setShouldRenderHtml(true);
    }, [showCellPos]);

    return shouldRenderHtml ? (
        <Html prepend>
            <chakra.div pos="absolute" w="30px" h="30px" display={showCellPos ? "" : "none"} userSelect="none">
                <chakra.span
                    pos="absolute"
                    top="0"
                    left="0"
                    transform="translate3d(-50%, -50%, 0)"
                    fontSize="10px"
                    opacity="0.6"
                >
                    {cell.id}
                </chakra.span>
            </chakra.div>
        </Html>
    ) : null;
};

export const showCellPosAtom = atom(false);
