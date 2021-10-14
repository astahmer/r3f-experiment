import { Flex } from "@chakra-ui/layout";
import { FlexProps } from "@chakra-ui/react";
import { WithChildren } from "@pastable/core";
import { memo } from "react";

import { MazeCell, MazeGridType } from "@/maze/mazeMachine";

export const MazeGrid = ({ maze }: { maze: MazeGridType }) => {
    return (
        <Flex maxW="80%" maxH="80%" flexDirection="column" pointerEvents="all">
            <Flex ml="30px">
                {maze[0].map((_, i) => (
                    <Cell key={i} display="path" border="none">
                        x{i}
                    </Cell>
                ))}
            </Flex>
            {maze.map((rows, y) => (
                <Flex key={y}>
                    <Cell display="path" border="none">
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
}: Pick<MazeCell, "display"> & Partial<WithChildren> & Omit<FlexProps, "display">) => (
    <Flex
        boxSize="30px"
        minWidth="30px"
        backgroundColor={colorByDisplayState[display]}
        border="1px solid rgb(250 128 114 / 20%)"
        color="cadetblue"
        justifyContent="center"
        alignItems="center"
        userSelect="none"
        {...props}
    >
        {children}
    </Flex>
);

const colorByDisplayState: Record<MazeCell["display"], string> = {
    empty: "dimgrey",
    wall: "burlywood",
    path: "white",
    blocked: "cadetblue",
    start: "green",
    current: "yellow",
    end: "salmon",
};
