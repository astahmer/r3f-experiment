import { Triplet } from "@react-three/cannon";
import { MutableRefObject, Ref } from "react";
import { Mesh } from "three";

export interface CommonObject {
    position?: Triplet;
    size?: Triplet;
    rotation?: Triplet;
    color?: string;
    wireframe?: boolean;
    meshRef?: MutableRefObject<Mesh> | Ref<Mesh>;
}
