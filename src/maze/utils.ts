import { Triplet } from "@react-three/cannon";
import { BoxGeometry, Color, DoubleSide, MeshStandardMaterial } from "three";

import { MazeCell } from "@/maze/mazeGeneratorMachine";

export const colorByDisplayState: Record<MazeCell["display"], string> = {
    empty: "#7c7b89",
    wall: "#8d1c1a",
    path: "#f1e4de",
    blocked: "#0b7fab",
    start: "#43640b",
    current: "#f4d75e",
    end: "#c33124",
    mark: "#80a71a",
};
export const material = new MeshStandardMaterial({ color: new Color(colorByDisplayState.empty), side: DoubleSide });
export const geometry = new BoxGeometry(1, 3, 1);
export const cameraPosition = [0, 70, 0] as Triplet;
