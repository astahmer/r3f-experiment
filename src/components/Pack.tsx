import { useConst } from "@chakra-ui/hooks";
import { WithChildren } from "@pastable/react";
import { Triplet, useBox } from "@react-three/cannon";
import { createContext, useContext } from "react";
import { Vector3 } from "three";

import { CommonObject } from "@/types";

// TODO zustand context transient updates ?
const PackContext = createContext(null);
export const usePackContext = () => useContext(PackContext);
export const Pack = ({ children, position, ...props }: WithChildren & Pick<CommonObject, "position" | "rotation">) => {
    const ctx = usePackContext();
    const relativePosition = useConst(new Vector3(...(ctx?.position || emptyV)));

    return (
        <PackContext.Provider
            value={{
                ...props,
                position: relativePosition
                    .clone()
                    .add(new Vector3(...position))
                    .toArray(),
            }}
        >
            {children}
        </PackContext.Provider>
    );
};
const emptyV = [0, 0, 0] as Triplet;
export const useObject = (...[fnProp, fwdRef, deps]: Parameters<typeof useBox>) => {
    const ctx = usePackContext();
    const relativePosition = useConst(new Vector3(...(ctx?.position || emptyV)));

    return useBox(
        (i) => {
            const { position, ...boxProps } = fnProp(i);

            return {
                ...boxProps,
                position: relativePosition
                    .clone()
                    .add(new Vector3(...position))
                    .toArray(),
            };
        },
        fwdRef,
        deps
    );
};
