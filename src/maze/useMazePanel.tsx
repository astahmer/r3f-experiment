import { useControls, useCreateStore } from "leva";

import { MazePickMode } from "@/maze/mazeGeneratorMachine";

const defaults = { width: 10, height: 10, random: 5, stepDelayInMs: 0 };

export const useMazePanel = (onModeChange?: (value: MazePickMode) => void) => {
    const store = useCreateStore();
    const controls = useControls(
        "maze",
        {
            mode: {
                options: ["both", "latest", "random"] as Array<MazePickMode>,
                value: "both" as MazePickMode,
                transient: false,
                onChange: onModeChange,
            },
            projection: { value: 0, min: 0, max: 5, step: 1 },
            width: { value: defaults.width, min: 4, max: 40, step: 2 },
            height: { value: defaults.height, min: 4, max: 40, step: 2 },
            random: { value: defaults.random, min: 1, max: 100, step: 5 },
            stepDelayInMs: { value: defaults.stepDelayInMs, min: 0, max: 1000, step: 100 },
            // state: { value: printFinalStatesPath(state), disabled: true },
        },
        { store: undefined }
    );

    return { store, ...controls };
};
