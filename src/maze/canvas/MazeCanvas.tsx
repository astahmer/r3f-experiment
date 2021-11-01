import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { useState } from "react";

import { Gizmo } from "@/components/Gizmo";
import { Zoom } from "@/components/Zoom";
import { useAtomSyncCallback } from "@/functions/useAtomSyncCallback";
import { useKey } from "@/functions/useKey";

import { cameraPosition, settingsAtom } from "../utils";
import { CanvasMazeGrid } from "./CanvasMazeGrid";

export const MazeCanvas = () => {
    const [key, setKey] = useState(0);

    // restarts the machine so it doesn't remain like before the HMR update
    useKey("r", () => {
        setKey((key) => key + 1);
        console.clear();
    });

    const getSettings = useAtomSyncCallback((get) => get(settingsAtom));

    return (
        <>
            <MazeCanvasRenderer>
                <CanvasMazeGrid key={key} {...getSettings()} />
            </MazeCanvasRenderer>
            <Leva hideCopyButton />
        </>
    );
};

const MazeCanvasRenderer = ({ children }) => {
    return (
        <Canvas
            orthographic
            camera={{ rotation: [-Math.PI / 2, 0, 0], position: cameraPosition, zoom: 2 }}
            mode="concurrent"
            // frameloop="demand"
            // performance={{ max: 0.3 }}
        >
            <axesHelper />
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <Gizmo />
            {/* <Physics gravity={[0, 0, 0]}>{children}</Physics> */}
            {children}
            <Zoom />
        </Canvas>
    );
};
