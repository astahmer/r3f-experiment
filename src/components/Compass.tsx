import { StatUpArrow } from "@chakra-ui/stat";
import { chakra } from "@chakra-ui/system";
import { Html } from "@react-three/drei";
import { HtmlProps } from "@react-three/drei/web/Html";
import { useFrame, useThree } from "@react-three/fiber";
import { Box, Flex } from "@react-three/flex";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { Spherical, Vector3 } from "three";
import { radToDeg } from "three/src/math/MathUtils";

import { AppText, TextProvider } from "./AppText";

export function HtmlCompass({ innerRef }) {
    return (
        <chakra.div ref={innerRef} display="flex" flexDir="column" ml="20px" p="10px" fontSize="0.8em">
            <chakra.div display="flex" flexDir="column" alignItems="center" m="auto" fontWeight="bold" fontSize="2em">
                <StatUpArrow />
                <span>N</span>
            </chakra.div>
            <chakra.div display="flex">
                <chakra.div p="2" mx="10px">
                    W
                </chakra.div>
                <chakra.div p="2" mx="10px">
                    E
                </chakra.div>
            </chakra.div>
            <chakra.div m="auto">S</chakra.div>
        </chakra.div>
    );
}

var dir = new Vector3();
var sph = new Spherical();

export const HUDCompass = (props: HtmlProps) => {
    const ref = useRef<HTMLDivElement>();
    useFrame((frame, delta) => {
        const camera = frame.camera;
        camera.getWorldDirection(dir);
        sph.setFromVector3(dir);
        ref.current.style.transform = `rotate(${radToDeg(sph.theta) - 180}deg)`;
    });
    return (
        <Html prepend zIndexRange={[-1, 0]} {...props}>
            <chakra.div pos="absolute" top="0" left="0" userSelect="none">
                <HtmlCompass innerRef={ref} />
            </chakra.div>
        </Html>
    );
};

const defaultFontSize = 0.4;
export function PlayerCompass() {
    const [key, setKey] = useState(0);
    const incrKey = () => setKey((current) => current + 1);

    const { viewport } = useThree();
    const { fontSize, scale } = useControls(
        "playerCompass",
        {
            fontSize: {
                min: 0.1,
                max: 3,
                step: 0.1,
                value: defaultFontSize,
            },
            scale: {
                min: 0.1,
                max: 3,
                step: 0.1,
                value: Math.min(1, (viewport.width / 16) * defaultFontSize),
            },
        },
        { collapsed: true }
    );

    // Refresh flex yoga layout
    useEffect(() => incrKey(), [fontSize, scale]);

    return (
        <Flex
            key={key}
            flexDirection="column"
            alignItems="center"
            position={[-0.5, 0.6, -0.5]}
            rotation={[-Math.PI / 2, 0, 0]}
            size={[3 * scale, 3 * scale, 0]}
            scale={[scale, scale, scale]}
        >
            <TextProvider fontSize={fontSize > 1 ? fontSize * 0.6 : fontSize} color="#010101" fillOpacity={0.8}>
                <Box dir="row" width="100%" height={scale / 2} justifyContent="center">
                    <Box>
                        <AppText bold>N</AppText>
                    </Box>
                </Box>
                <Box dir="row" justifyContent="space-between" width={"100%"} height={scale} mt={0.3} mb={0.1}>
                    <Box>
                        <AppText>W</AppText>
                    </Box>
                    <Box margin="auto">
                        <AppText>E</AppText>
                    </Box>
                </Box>
                <Box dir="row" width="100%" height={scale / 2} justifyContent="center">
                    <Box>
                        <AppText>S</AppText>
                    </Box>
                </Box>
            </TextProvider>
        </Flex>
    );
}

const Square = ({ color = "red" }) => (
    <mesh>
        <boxGeometry />
        <meshStandardMaterial color={color} />
    </mesh>
);
