import { useControls, useCreateStore } from "leva";

import { MazePickMode } from "@/maze/mazeMachine";

export const useMazePanel = (onModeChange: (value: MazePickMode) => void) => {
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
            width: { value: 25, min: 4, max: 40, step: 2 },
            height: { value: 25, min: 4, max: 40, step: 2 },
            random: { value: 30, min: 1, max: 100, step: 5 },
            // state: { value: printFinalStatesPath(state), disabled: true },
        },
        { store }
    );

    return { store, ...controls };
};