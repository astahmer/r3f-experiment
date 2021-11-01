import { useUpdateAtom } from "jotai/utils";
import { useControls, useCreateStore } from "leva";

import { MazeModes, UpdateSettingsArgs } from "@/maze/mazeGeneratorMachine";

import { defaultSettings, settingsAtom } from "../utils";

export const useMazePanel = (onChange: (args: UpdateSettingsArgs) => void) => {
    // const store = useCreateStore();
    const setSettings = useUpdateAtom(settingsAtom);
    const makeOnChange = (key: string, shouldRefreshGrid?: boolean) => (value: any) => {
        setSettings((current) => ({ ...current, [key]: value }));
        onChange({ key, value, shouldRefreshGrid });
    };

    const controls = useControls(
        "maze",
        {
            mode: {
                options: MazeModes,
                value: defaultSettings.mode,
                onChange: makeOnChange("mode"),
            },
            width: { value: defaultSettings.width, min: 4, max: 200, step: 2, onChange: makeOnChange("width", true) },
            height: {
                value: defaultSettings.height,
                min: 4,
                max: 200,
                step: 2,
                onChange: makeOnChange("height", true),
            },
            random: { value: defaultSettings.random, min: 1, max: 100, step: 5, onChange: makeOnChange("random") },
            stepDelayInMs: {
                value: defaultSettings.stepDelayInMs,
                min: 0,
                max: 1000,
                step: 100,
                onChange: makeOnChange("stepDelayInMs"),
            },
            // state: { value: printFinalStatesPath(state), disabled: true },
        }
        // { store }
    );
    return controls;

    // return { store };
};
