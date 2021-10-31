import { Flex } from "@chakra-ui/layout";
import { FlexProps, useDisclosure } from "@chakra-ui/react";
import { WithChildren } from "@pastable/core";
import { memo, useRef } from "react";

import { useKey } from "@/functions/useKey";
import { MazeCell, MazeGridType } from "@/maze/mazeGeneratorMachine";

export const MazeGrid = ({ maze }: { maze: MazeGridType }) => {
    return (
        <Flex maxW="80%" maxH="80%" flexDirection="column" pointerEvents="all">
            <Flex ml="30px">
                {maze[0].map((_, i) => (
                    <Cell key={i} display="path" backgroundColor="white" border="none">
                        x{i}
                    </Cell>
                ))}
            </Flex>
            {maze.map((rows, y) => (
                <Flex key={y}>
                    <Cell display="path" backgroundColor="white" border="none">
                        y{y}
                    </Cell>
                    {rows.map((cell, x) => (
                        <MazeCellItem key={x} {...cell} />
                    ))}
                </Flex>
            ))}
        </Flex>
    );
};

export const MazeCellItem = memo((cell: MazeCell) => (
    <Cell display={cell.display} children={cell.id} fontSize="0.5em" fontWeight="bold" color="rgb(0 0 0 / 30%)" />
));

export const Cell = ({
    children,
    display,
    ...props
}: Pick<MazeCell, "display"> & Partial<WithChildren> & Omit<FlexProps, "display">) => {
    const ref = useRef<HTMLDivElement>();

    const toggle = useDisclosure();
    useKey("u", toggle.onToggle);

    return (
        <Flex
            boxSize="10px"
            minWidth="10px"
            backgroundColor={colorByDisplayState[display]}
            border="1px solid rgb(250 128 114 / 25%)"
            color="cadetblue"
            justifyContent="center"
            alignItems="center"
            userSelect="none"
            ref={ref}
            onClick={() => (ref.current.style.background = "red")}
            {...props}
        >
            {toggle.isOpen && children}
        </Flex>
    );
};

const colorByDisplayState: Record<MazeCell["display"], string> = {
    empty: "dimgrey",
    wall: "burlywood",
    path: "orange",
    blocked: "cadetblue",
    start: "green",
    current: "yellow",
    end: "salmon",
    mark: "orange",
};
