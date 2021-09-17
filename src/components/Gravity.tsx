import { WithChildren } from "@pastable/react";
import { PublicApi, Triplet } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { FolderSettings } from "leva/dist/declarations/src/types";
import { createContext, useContext } from "react";

import { useKey } from "@/functions/useKey";
import { useMassRef } from "@/functions/useVelocity";

// const defaultGravity = [0, -10, 0] as Triplet;
const pausedGravity = [0, 0, 0] as Triplet;
export const useGravity = ({
    api,
    gravity: gravityProp,
    isPaused: isPausedProp,
    isReversed: isReversedProp,
}: UseGravityProps) => {
    const ctxGravity = useGravityContext();
    const gravity = gravityProp || ctxGravity?.gravity;
    if (!gravity) {
        throw new Error("You need to pass a gravity either through the `gravity` prop or `GravityContext`");
    }
    const isPaused = isPausedProp || ctxGravity?.isPaused;
    const isReversed = isReversedProp || ctxGravity?.isReversed;

    const [gx, gy, gz] = isPaused ? pausedGravity : isReversed ? (gravity.map((v) => -v) as Triplet) : gravity;
    const massRef = useMassRef(api);

    useFrame(() => api.applyLocalForce([gx, massRef.current * gy, gz], [0, 0, 0]));
};
export interface UseGravityProps extends Partial<GravityContext> {
    // ref: MutableRefObject<Object3D>;
    api: PublicApi;
}

// Context
const gravityContext = createContext(null as GravityContext);
export const useGravityContext = () => useContext(gravityContext);
export const GravityProvider = ({ children, gravity, isPaused, isReversed }: WithChildren & GravityContext) => (
    <gravityContext.Provider value={{ gravity, isPaused, isReversed }}>{children}</gravityContext.Provider>
);
interface GravityContext {
    gravity: Triplet;
    isPaused?: boolean;
    isReversed?: boolean;
}

// Global provider controller
export const useControllableGravity = (
    {
        folderName,
        initialGy = -50,
        initialValues,
        pauseKey = "p",
        reverseKey = "g",
    }: {
        folderName: string;
        initialGy?: number;
        initialValues?: {
            isPaused?: boolean;
            isReversed?: boolean;
            gravityY?: any;
        };
        pauseKey?: string;
        reverseKey?: string;
    },
    folderSettings?: FolderSettings
) => {
    const [{ isReversed, gravityY, isPaused }, set] = useControls(
        folderName,
        () => ({
            isPaused: true,
            isReversed: false,
            gravityY: { min: -100, max: 100, step: 5, value: initialGy },
            ...initialValues,
        }),
        folderSettings
    );
    const gravity = [0, gravityY, 0] as Triplet;

    useKey(reverseKey, () => set({ isReversed: !isReversed }));
    useKey(pauseKey, () => set({ isPaused: !isPaused }));

    return { gravity, isPaused, isReversed };
};
