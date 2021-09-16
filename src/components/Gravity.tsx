import { WithChildren } from "@pastable/react";
import { PublicApi, Triplet, useBox } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { createContext, useContext } from "react";

import { useKey } from "@/functions/useKey";
import { useMassRef } from "@/functions/useVelocity";

// const defaultGravity = [0, -10, 0] as Triplet;
export const useGravity = ({ api, gravity: gravityProp }: UseGravityProps) => {
    const ctxGravity = useGravityContext();
    const gravity = gravityProp || ctxGravity;
    if (!gravity) {
        throw new Error("You need to pass a gravity either through the `gravity` prop or `GravityContext`");
    }

    const [gx, gy, gz] = gravity;
    const massRef = useMassRef(api);

    useFrame(() => api.applyLocalForce([gx, massRef.current * gy, gz], [0, 0, 0]));
};
export interface UseGravityProps {
    // ref: MutableRefObject<Object3D>;
    api: PublicApi;
    gravity?: Triplet;
}

const gravityContext = createContext(null as Triplet);
const useGravityContext = () => useContext(gravityContext);
export const GravityProvider = ({ children, gravity }) => (
    <gravityContext.Provider value={gravity}>{children}</gravityContext.Provider>
);

export const useControllableGravity = (gravityProp?: Triplet) => {
    const [{ isReversedLocalGravity, localGravityY, isPaused }, set] = useControls(() => ({
        isPaused: true,
        isReversedLocalGravity: false,
        localGravityY: { min: 0, max: 100, step: 5, value: 50 },
    }));
    const gravity = gravityProp || [0, localGravityY, 0];

    useKey("g", () => set({ isReversedLocalGravity: !isReversedLocalGravity }));
    useKey("p", () => set({ isPaused: !isPaused }));

    const gravityValue = isReversedLocalGravity ? gravity : (gravity.map((v) => -v) as Triplet);

    return isPaused ? [0, 0, 0] : gravityValue;
};

// Not working :(
export function Gravity({ children, gravity: gravityProp }: WithChildren & Pick<UseGravityProps, "gravity">) {
    const ctxGravity = useGravityContext();
    const gravity = gravityProp || ctxGravity;

    const [ref, api] = useBox(() => ({
        args: [0, 0, 0],
        mass: 1,
        angularDamping: 1,
        linearFactor: [0, 1, 0],
        linearDamping: 0.99,
        material: { friction: 0 },
    }));
    useGravity({ api, gravity });

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
