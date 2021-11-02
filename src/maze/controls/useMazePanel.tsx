import { useUpdateAtom } from "jotai/utils";
import { useControls, useCreateStore } from "leva";
import { OnChangeHandler } from "leva/dist/declarations/src/types";

import { MazeModes, UpdateSettingsArgs } from "@/maze/mazeGeneratorMachine";

import { defaultSettings, settingsAtom } from "../utils";

export const useMazePanel = (onChange: (args: UpdateSettingsArgs) => void) => {
    // const store = useCreateStore();
    const setSettings = useUpdateAtom(settingsAtom);
    const makeOnChange =
        (key: string, shouldRefreshGrid?: boolean): OnChangeHandler =>
        (value, path, ctx) => {
            setSettings((current) => ({ ...current, [key]: value }));
            onChange({ key, value, shouldRefreshGrid: ctx.fromPanel ? shouldRefreshGrid : false });
        };

    const [_, set] = useControls(
        "maze",
        () => ({
            width: { value: defaultSettings.width, min: 4, max: 200, step: 2, onChange: makeOnChange("width", true) },
            height: {
                value: defaultSettings.height,
                min: 4,
                max: 200,
                step: 2,
                onChange: makeOnChange("height", true),
            },
            mode: {
                options: MazeModes,
                value: defaultSettings.mode,
                onChange: makeOnChange("mode"),
            },
            random: {
                value: defaultSettings.random,
                min: 1,
                max: 100,
                step: 5,
                onChange: makeOnChange("random"),
                render: (get) => ["mixed", "both", "random"].includes(get("maze.mode")),
            },
            stepDelayInMs: {
                value: defaultSettings.stepDelayInMs,
                min: 0,
                max: 1000,
                step: 100,
                onChange: makeOnChange("stepDelayInMs"),
            },
            // state: { value: printFinalStatesPath(state), disabled: true },
        })
        // { store }
    );
    return set;

    // return { store };
};
