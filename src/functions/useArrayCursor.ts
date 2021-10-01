import { SetState } from "@pastable/core";
import { useCallback, useEffect, useState } from "react";

export function useArrayCursor(length: number, initialIndex = -1, shouldLoop = true): UseArrayCursorReturn {
    const [activeIndex, setActiveIndex] = useState(initialIndex);

    // Update activeIndex when initialIndex changes
    useEffect(() => {
        if (activeIndex !== initialIndex) {
            setActiveIndex(initialIndex);
        }
    }, [initialIndex]);

    const prev = useCallback(() => {
        const updatedIndex = updateIndex("prev", activeIndex, length, shouldLoop);
        return setActiveIndex(updatedIndex);
    }, [activeIndex, length, shouldLoop]);

    const next = useCallback(() => {
        const updatedIndex = updateIndex("next", activeIndex, length, shouldLoop);
        return setActiveIndex(updatedIndex);
    }, [activeIndex, length, shouldLoop]);

    const reset = useCallback(() => setActiveIndex(initialIndex), [initialIndex]);

    return [activeIndex, { set: setActiveIndex, reset, prev, next }];
}

export type UseArrayCursorActions = {
    set: SetState<number>;
    reset: () => void;
    prev: () => void;
    next: () => void;
};
export type UseArrayCursorReturn = [number, UseArrayCursorActions];

function updateIndex(direction: "prev" | "next", activeIndex: number, length: number, shouldLoop: boolean) {
    if (length <= 0) {
        return 0;
    }

    if (shouldLoop && activeIndex === -1) {
        return direction === "prev" ? length - 1 : 0;
    }

    if (direction === "prev") {
        if (shouldLoop) {
            return (activeIndex - 1 + length) % length;
        } else {
            return activeIndex - 1 >= 0 ? activeIndex - 1 : 0;
        }
    } else {
        if (shouldLoop) {
            return (activeIndex + 1) % length;
        } else {
            return activeIndex + 1 < length ? activeIndex + 1 : activeIndex;
        }
    }
}
