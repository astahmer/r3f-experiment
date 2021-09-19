import { useConst } from "@chakra-ui/hooks";
import { PublicApi, Triplet } from "@react-three/cannon";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

export const useVelocity = (api: PublicApi, { initial = [0, 0, 0], onUpdate }: UseVelocityOptions = {}) => {
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

export const usePosition = (api: PublicApi, { initial = [0, 0, 0], onUpdate }: UseVelocityOptions = {}) => {
    const pRef = useRef<Triplet>(initial);
    const pos = useConst<Vector3>((() => new Vector3(...initial)) as any);

    useEffect(
        () =>
            api.position.subscribe((v) => {
                pRef.current = v;
                onUpdate?.(v);
            }),
        []
    );
    useFrame(() => pos.set(...pRef.current));

    return pos;
};

interface UseVelocityOptions {
    initial?: Triplet;
    onUpdate?: (v: Triplet) => void;
}

export const useMassRef = (
    api: PublicApi,
    { initial = 0, onUpdate }: { initial?: number; onUpdate?: (m: number) => void } = {}
) => {
    const ref = useRef<number>(initial);
    useEffect(
        () =>
            api.mass.subscribe((m) => {
                ref.current = m;
                onUpdate?.(m);
            }),
        []
    );

    return ref;
};
