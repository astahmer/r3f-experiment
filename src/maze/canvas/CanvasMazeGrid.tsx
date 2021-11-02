import { Position } from "@react-three/drei/helpers/Position";
import { useInterpret, useSelector } from "@xstate/react";
import { useUpdateAtom } from "jotai/utils";
import { useControls } from "leva";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { printFinalStatesPath } from "@/functions/xstate-utils";
import { MazeCell, MazeSettings, createMazeGeneratorMachine } from "@/maze/mazeGeneratorMachine";

import { MazeControls } from "../controls/MazeControls";
import { colorByDisplayState } from "../utils";
import { CellsList, showCellPosAtom } from "./CellsList";

export function CanvasMazeGrid(initialSettings: MazeSettings) {
    const [settings, setSettings] = useState(initialSettings);

    const updateCellDisplay = (cell: MazeCell) => {
        const mesh = gridRefs.current.get(cell.id);
        if (!mesh) return;

        // console.log(cell, colorByDisplayState[cell.display]);
        mesh.color.set(colorByDisplayState[cell.display]);
    };
    const paintWholeGrid = (list: MazeCell[]) => {
        if (!gridRefs.current.size) return;

        list.forEach(updateCellDisplay);
    };

    const service = useInterpret(
        () => createMazeGeneratorMachine(settings),
        {},
        (next) => {
            if (["RESET", "IMPORT"].includes(next.event.type)) return paintWholeGrid(next.context.grid.flat());
            if (["PAUSE", "RUN"].includes(next.event.type)) return;
            if (next.event.type === "UpdateSettings") {
                return setSettings(next.context.settings);
            }

            if (!gridRefs.current.size) return;
            next.context.displayChanged.forEach(updateCellDisplay);
        }
    );
    const send = service.send;

    // Paint maze after maze was generated
    useLayoutEffect(() => service && repaintMaze(), [service]);

    const state = useSelector(service, (state) => printFinalStatesPath(state));
    const bruteForcer = useSelector(service, (state) => state.children.bruteForcer);
    const finder = useSelector(service, (state) => state.children.finder);
    const maze = useSelector(service, (state) => state.context.grid);

    // repaintMaze on bruteForcer update
    useEffect(() => {
        if (!bruteForcer) return;

        const sub = bruteForcer.subscribe(() => {
            if (!gridRefs.current.size) return;

            repaintMaze();
        });
        return sub.unsubscribe;
    }, [bruteForcer]);

    // repaintMaze on finder update
    useEffect(() => {
        if (!finder) return;

        const sub = finder.subscribe(() => {
            if (!gridRefs.current.size) return;

            repaintMaze();
        });
        return sub.unsubscribe;
    }, [finder]);

    const gridRefs = useRef(new Map<MazeCell["id"], Position>());
    const repaintMaze = () => paintWholeGrid(maze.flat());

    const setShowCellPos = useUpdateAtom(showCellPosAtom);
    const { showUI } = useControls({
        showUI: { label: "Show UI Controls", value: true },
        showCellPos: { value: false, onChange: (v) => setShowCellPos(v) },
    });

    return (
        <>
            {/* {maze && (
                <WallMap
                    position={[-settings.width / 2, 0, -settings.height / 2]}
                    wallMap={maze
                        .flat()
                        .map((cell) => [
                            cell.x,
                            cell.y,
                            { wireframe: false, meshRef: (node) => gridRefs.current.set(cell.id, node as DumbBoxMesh) },
                        ])}
                />
            )} */}
            {maze && (
                <group position={[-settings.width / 2, 0, -settings.height / 2]}>
                    <CellsList maze={maze} registerMesh={(cell, node) => gridRefs.current.set(cell.id, node)} />
                </group>
            )}
            <MazeControls {...({ state, send, service, maze, bruteForcer, finder, repaintMaze, showUI } as any)} />
        </>
    );
}
