import { useControls, useCreateStore } from "leva";

import { MazePickMode, UpdateSettingsArgs } from "@/maze/mazeGeneratorMachine";

import { defaultControls } from "./utils";

export const useMazePanel = (onChange: (args: UpdateSettingsArgs) => void) => {
    // const store = useCreateStore();
    const makeOnChange = (key: string, shouldRefreshGrid?: boolean) => (value: any) =>
        onChange({ key, value, shouldRefreshGrid });

    return useControls(
        "maze",
        {
            mode: {
                options: ["both", "latest", "random"] as Array<MazePickMode>,
                value: defaultControls.mode,
                onChange: makeOnChange("mode"),
            },
            projection: {
                value: defaultControls.projection,
                min: 0,
                max: 5,
                step: 1,
                onChange: makeOnChange("projection"),
            },
            width: { value: defaultControls.width, min: 4, max: 200, step: 2, onChange: makeOnChange("width", true) },
            height: {
                value: defaultControls.height,
                min: 4,
                max: 200,
                step: 2,
                onChange: makeOnChange("height", true),
            },
            random: { value: defaultControls.random, min: 1, max: 100, step: 5, onChange: makeOnChange("random") },
            stepDelayInMs: {
                value: defaultControls.stepDelayInMs,
                min: 0,
                max: 1000,
                step: 100,
                onChange: makeOnChange("stepDelayInMs"),
            },
            // state: { value: printFinalStatesPath(state), disabled: true },
        }
        // { store }
    );

    // return { store };
};
