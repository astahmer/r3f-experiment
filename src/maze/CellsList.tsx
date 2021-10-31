import { useMergeRefs } from "@chakra-ui/react";
import { chunk } from "@pastable/utils";
import { Instance, Instances } from "@react-three/drei";
import { Position } from "@react-three/drei/helpers/Position";
import { MutableRefObject, Ref, useRef } from "react";

import { MazeCell, MazeGridType } from "@/maze/mazeGeneratorMachine";
import { CommonObject } from "@/types";

import { colorByDisplayState, geometry, material } from "./utils";

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
                            index={i}
                            range={chunk.length}
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
    position,
    rotation,
    instanceRef,
    color,
}: Omit<CommonObject, "meshRef"> & {
    instanceRef?: MutableRefObject<Position> | Ref<Position>;
    index: number;
    range: number;
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
        </group>
    );
}
