import { Triplet } from "@react-three/cannon";
import { ThreeEvent } from "@react-three/fiber";
import { MutableRefObject, ReactNode, Ref } from "react";
import { Mesh } from "three";

export interface CommonObject {
    position?: Triplet;
    size?: Triplet;
    rotation?: Triplet;
    color?: string;
    wireframe?: boolean;
    meshRef?: MutableRefObject<Mesh> | Ref<Mesh>;
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
    render?: () => ReactNode;
}
