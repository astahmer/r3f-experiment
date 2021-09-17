import { State } from "xstate";

export type AnyState = State<any, any, any, any>;

export const getFinalStatesPath = (state: AnyState) => {
    const paths = state.toStrings();
    const rootPaths = paths.filter((path) => !path.includes("."));
    const maxNestingLevel = rootPaths
        .map((rootPath) =>
            paths
                .filter((path) => path.startsWith(rootPath))
                .map((path) => path.split(".").length)
                .reduce((acc, current) => Math.max(acc, current), 0)
        )
        .reduce((acc, max, index) => ({ ...acc, [rootPaths[index]]: max }), {});
    const finalPaths = paths
        .filter((path) => path.split(".").length === maxNestingLevel[rootPaths.find((root) => path.startsWith(root))])
        .sort();

    return finalPaths;
};
export const printFinalStatesPath = (state: AnyState) => {
    const paths = getFinalStatesPath(state);
    return paths.length === 1 ? paths[0] : paths.join(" / ");
};

export const parseStateValue = (stateStr: string) => {
    if (!stateStr) return;

    try {
        const parsed = JSON.parse(stateStr);
        return State.create(parsed);
    } catch (error) {
        return;
    }
};
export const areEqualStateValuePath = (a: AnyState, b: AnyState) => getFinalStatesPath(a) === getFinalStatesPath(b);
