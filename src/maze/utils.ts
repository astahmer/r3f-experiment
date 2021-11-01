import { Triplet } from "@react-three/cannon";
import { atomWithStorage } from "jotai/utils";
import { BoxGeometry, Color, DoubleSide, MeshStandardMaterial } from "three";

import { MazeCell, MazePickMode, MazeSettings } from "@/maze/mazeGeneratorMachine";

export const colorByDisplayState: Record<MazeCell["display"], string> = {
    empty: "#7c7b89",
    wall: "#8d1c1a",
    path: "#f1e4de",
    blocked: "#0b7fab",
    start: "#43640b",
    current: "#fb8500",
    end: "#c33124",
    mark: "#023047",
};
export const material = new MeshStandardMaterial({ color: new Color(colorByDisplayState.empty), side: DoubleSide });
export const geometry = new BoxGeometry(1, 3, 1);
export const cameraPosition = [0, 70, 0] as Triplet;

export const defaultSettings: MazeSettings = {
    width: 50,
    height: 50,
    random: 5,
    stepDelayInMs: 0,
    mode: "both" as MazePickMode,
    // TODO
    minStepsBeforeBranching: 0,
    withLoops: false,
};
export const settingsAtom = atomWithStorage("r3f/settings", defaultSettings);
