import { Stack } from "@chakra-ui/layout";
import { ChakraProvider, Portal, chakra } from "@chakra-ui/react";
import { Physics } from "@react-three/cannon";
import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useInterpret, useSelector } from "@xstate/react";
import { LevaPanel } from "leva";
import { useEffect, useRef, useState } from "react";

import { DumbBoxMesh } from "@/components/DumbBox";
import { Gizmo } from "@/components/Gizmo";
import { WallMap } from "@/components/Wall";
import { useKey } from "@/functions/useKey";
import { MazeCell, createMazeMachine } from "@/maze/mazeMachine";

import { MazeActions, MazeGeneratorActions, SolverActions } from "./MazeActions";
import { useMazePanel } from "./useMazePanel";

export const MazeCanvas = () => {
    // (value) => send("MODE", { value })
    const { store, ...props } = useMazePanel();
    const [key, setKey] = useState(0);

    // restarts the machine so it doesn't remain like before the HMR update
    useKey("r", () => {
        setKey((key) => key + 1);
        console.clear();
    });

    return (
        <>
            <MazeWorld>
                <CanvasMazeGrid key={key} {...props} />
            </MazeWorld>
            <LevaPanel store={store} />
        </>
    );
};

const MazeWorld = ({ children }) => (
    <Canvas orthographic gl={{ antialias: false }} camera={{ rotation: [0, 0, 0], position: [0, 20, 0], zoom: 30 }}>
        <axesHelper />
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <Gizmo />
        <Physics gravity={[0, 0, 0]}>{children}</Physics>
    </Canvas>
);

const CanvasMazeGrid = ({
    mode,
    projection,
    width,
    height,
    random,
}: Omit<ReturnType<typeof useMazePanel>, "store">) => {
    const paintGrid = (list: MazeCell[]) => {
        if (!gridRefs.current.size) return;

        list.forEach((cell) => {
            const mesh = gridRefs.current.get(cell.id);
            if (!mesh) return;

            // mesh.material.visible = cell.state !== "path";
            mesh.material.color.setColorName(colorByDisplayState[cell.display]);
        });
    };

    const service = useInterpret(
        () => createMazeMachine({ width, height, stepDelayInMs: 0, randomChance: random, projection, mode }),
        {},
        (next) => {
            if (!gridRefs.current.size) return;
            paintGrid(next.context.grid.flat());
        }
    );
    const send = service.send;

    const state = useSelector(service, (state) => state.value);
    const solver = useSelector(service, (state) => state.children.solver);
    const maze = useSelector(service, (state) => state.context.grid);

    useEffect(() => {
        if (!solver) return;

        const sub = solver.subscribe(() => {
            if (!gridRefs.current.size) return;
            paintGrid(maze.flat());
        });
        return sub.unsubscribe;
    }, [solver]);

    const gridRefs = useRef(new Map<MazeCell["id"], DumbBoxMesh>());

    return (
        <>
            {maze && (
                <WallMap
                    position={[-width / 2, 0, -height / 2]}
                    wallMap={maze
                        .flat()
                        .map((cell) => [
                            cell.x,
                            cell.y,
                            { wireframe: false, meshRef: (node) => gridRefs.current.set(cell.id, node as DumbBoxMesh) },
                        ])}
                />
            )}
            <Html prepend>
                <ChakraProvider>
                    <Portal>
                        <chakra.div pos="absolute" bottom="0" left="0" userSelect="none">
                            <Stack pointerEvents="none">
                                <MazeGeneratorActions state={state as any} send={send} />
                                <MazeActions getMaze={() => maze} state={state as any} send={send} />
                                {state === "done" && solver && <SolverActions actor={solver} />}
                            </Stack>
                        </chakra.div>
                    </Portal>
                </ChakraProvider>
            </Html>
        </>
    );
};

const colorByDisplayState: Record<MazeCell["display"], string> = {
    empty: "dimgrey",
    wall: "brown",
    path: "white",
    blocked: "cadetblue",
    start: "green",
    current: "yellow",
    end: "blue",
};
