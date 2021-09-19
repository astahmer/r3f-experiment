import { atom } from "jotai";

export const playerFinalStatesPathAtom = atom("");

// Values must be base2 since the comparison is made with the | operator
export const CollisionGroup = {
    PLAYER: 1,
    GROUND: 2,
    TRAMPOLINE: 4,
};
