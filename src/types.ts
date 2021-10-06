import { Triplet } from "@react-three/cannon";

export interface CommonObject {
    position?: Triplet;
    size?: Triplet;
    rotation?: Triplet;
    color?: string;
}
