import { WithChildren } from "@pastable/react";
import { Text as TextImpl } from "@react-three/drei";
import { useReflow } from "@react-three/flex";
import { ComponentProps, createContext, useContext } from "react";

export function AppText({
    bold = false,
    anchorX = "left",
    anchorY = "top",
    textAlign = "left",
    ...props
}: AppTextProps) {
    const reflow = useReflow();
    const font = bold ? "/assets/Inter-Bold.woff" : "/assets/Inter-Regular.woff";
    const txt = useContext(textContext);

    return (
        <TextImpl
            anchorX={anchorX}
            anchorY={anchorY}
            textAlign={textAlign}
            font={font}
            onSync={reflow}
            {...txt}
            {...props}
        />
    );
}

export type AppTextProps = ComponentProps<typeof TextImpl> & { bold?: boolean };

const textContext = createContext({} as Omit<AppTextProps, "children">);
export const TextProvider = ({ children, ...props }: WithChildren & AppTextProps) => (
    <textContext.Provider value={props}>{children}</textContext.Provider>
);
