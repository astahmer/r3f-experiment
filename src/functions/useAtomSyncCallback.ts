import { Setter, atom } from "jotai";
import { Scope, WritableAtom } from "jotai/core/atom";
import { useUpdateAtom } from "jotai/utils";
import { useCallback, useMemo, useRef } from "react";

export type WriteGetter = Parameters<WritableAtom<unknown, unknown>["write"]>[0];

export function useAtomSyncCallback<Result, Arg>(
    callback: (get: WriteGetter, set: Setter, arg?: Arg) => Result,
    scope?: Scope
) {
    const anAtom = useMemo(
        () =>
            atom(null, (get, set, arg: Arg | undefined) => {
                resultRef.current = callback(get, set, arg);
            }),
        [callback]
    );
    const resultRef = useRef(null as Result);
    const invoke = useUpdateAtom(anAtom, scope);

    return useCallback(
        (arg?: Arg) => {
            invoke(arg);
            return resultRef.current;
        },
        [invoke]
    );
}
