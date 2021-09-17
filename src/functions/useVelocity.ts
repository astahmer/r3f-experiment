import { useConst } from "@chakra-ui/hooks";
import { PublicApi, Triplet } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

export const useVelocity = (
    api: PublicApi,
    { initial = [0, 0, 0], onUpdate }: { initial?: Triplet; onUpdate?: (v: Triplet) => void }
) => {
    const vRef = useRef<Triplet>(initial);
    const vel = useConst<Vector3>((() => new Vector3(...initial)) as any);

    useEffect(
        () =>
            api.velocity.subscribe((v) => {
                vRef.current = v;
                onUpdate?.(v);
            }),
        []
    );
    useFrame(() => vel.set(...vRef.current));

    return vel;
};

export const usePosition = (api: PublicApi, initial: Triplet = [0, 0, 0]) => {
    const pRef = useRef<Triplet>(initial);
    const pos = useConst<Vector3>((() => new Vector3(...initial)) as any);

    useEffect(() => api.position.subscribe((v) => (pRef.current = v)), []);
    useFrame(() => pos.set(...pRef.current));

    return pos;
};

export const useMassRef = (api: PublicApi, initial: number = 0) => {
    const ref = useRef<number>(initial);
    useEffect(() => api.mass.subscribe((v) => (ref.current = v)), []);

    return ref;
};
