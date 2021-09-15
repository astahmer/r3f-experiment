import { useConst, useEventListener } from "@chakra-ui/react";

export const useKeyControls = () => {
    const pressedRef = useConst({
        up: false,
        down: false,
        left: false,
        right: false,
        space: false,
        anyDir: false,
        keys: new Set(),
    });

    useEventListener(
        "keydown",
        (e) => {
            if (e.code === "KeyW") pressedRef.up = true;
            if (e.code === "KeyS") pressedRef.down = true;
            if (e.code === "KeyA") pressedRef.left = true;
            if (e.code === "KeyD") pressedRef.right = true;
            if (e.code === "Space") pressedRef.space = true;
            if (pressedRef.up || pressedRef.down || pressedRef.left || pressedRef.right) pressedRef.anyDir = true;
            pressedRef.keys.add(e.key);
            pressedRef.keys.add(e.code);
        },
        undefined,
        { passive: true }
    );
    useEventListener("keyup", (e) => {
        if (e.code === "KeyW") pressedRef.up = false;
        if (e.code === "KeyS") pressedRef.down = false;
        if (e.code === "KeyA") pressedRef.left = false;
        if (e.code === "KeyD") pressedRef.right = false;
        if (e.code === "Space") pressedRef.space = false;
        if (!(pressedRef.up || pressedRef.down || pressedRef.left || pressedRef.right)) pressedRef.anyDir = false;
        pressedRef.keys.delete(e.key);
        pressedRef.keys.delete(e.code);
    }),
        undefined,
        { passive: true };

    return pressedRef;
};

const noop = () => {};
export const useKey = (key: string, onKeyDown: () => void, onKeyUp: () => void = noop) => {
    useEventListener("keydown", (e) => {
        if (e.key === key || e.code === key || e.code === "Key" + key.toUpperCase()) onKeyDown();
    });
    useEventListener("keyup", (e) => {
        if (e.key === key || e.code === key || e.code === "Key" + key.toUpperCase()) onKeyUp();
    });
};
