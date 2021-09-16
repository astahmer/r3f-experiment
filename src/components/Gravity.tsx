import { WithChildren } from "@pastable/react";
import { PublicApi, Triplet, useBox } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
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
const useGravityContext = () => useContext(gravityContext);
export const GravityProvider = ({ children, gravity, isPaused, isReversed }: WithChildren & GravityContext) => (
    <gravityContext.Provider value={{ gravity, isPaused, isReversed }}>{children}</gravityContext.Provider>
);
interface GravityContext {
    gravity: Triplet;
    isPaused?: boolean;
    isReversed?: boolean;
}

// Global provider controller
export const useControllableGravity = (gravityProp?: Triplet) => {
    const [{ isReversedLocalGravity, localGravityY, isPaused }, set] = useControls(() => ({
        isPaused: true,
        isReversedLocalGravity: false,
        localGravityY: { min: 0, max: 100, step: 5, value: 50 },
    }));
    const gravity = gravityProp || [0, localGravityY, 0];

    useKey("g", () => set({ isReversedLocalGravity: !isReversedLocalGravity }));
    useKey("p", () => set({ isPaused: !isPaused }));

    return { gravity, isPaused, isReversed: isReversedLocalGravity };
};

// Not working :(
export function Gravity({ children, gravity: gravityProp }: WithChildren & Pick<UseGravityProps, "gravity">) {
    const ctxGravity = useGravityContext();
    const gravity = gravityProp || ctxGravity?.gravity;

    const [ref, api] = useBox(() => ({
        args: [0, 0, 0],
        mass: 1,
        angularDamping: 1,
        linearFactor: [0, 1, 0],
        linearDamping: 0.99,
        material: { friction: 0 },
    }));
    useGravity({ api, gravity, isPaused: ctxGravity?.isPaused });

    return (
        <group ref={ref}>
            {/* <group> */}
            {/* <mesh ref={ref}>
                    <planeGeometry args={[1, 1]} attach="geometry" />
                    <meshStandardMaterial attach="material" color="grey" side={DoubleSide} />
                </mesh> */}
            {children}
        </group>
    );
}
