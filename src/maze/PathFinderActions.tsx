import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { useSelector } from "@xstate/react";
import { useRef } from "react";

import { useKey } from "@/functions/useKey";
import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";

import { MazeCell, MazeGridType } from "./mazeGeneratorMachine";
import { MazePathFinderContext, getPathNeighbors } from "./mazePathFinderMachine";

const isDoneSelector = (state: AnyState) => state.matches("done");
const isAutoSelector = (state: AnyState<MazePathFinderContext>) => state.matches("running");

export const PathFinderActions = ({ actor, paintMaze }: { actor; paintMaze: () => void }) => {
    const isDone = useSelector(actor, isDoneSelector);
    const isAuto = useSelector(actor, isAutoSelector);

    const send = actor.send;

    return (
        <>
            <HStack pointerEvents="all">
                <Button onClick={() => send("FINDER_STEP")} isDisabled={isDone || isAuto}>
                    Find Step
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || isAuto}>
                    Auto find
                </Button>
                <Button onClick={() => send("FINDER_PAUSE")} isDisabled={isDone || !isAuto}>
                    Pause pathfinding
                </Button>
                <Button onClick={() => console.log(actor.state.context)}>Log ctx</Button>
            </HStack>
            <DebugPathFinder actor={actor} paintMaze={paintMaze} />
        </>
    );
};

const rootBranchCellSelector = (state: AnyState<MazePathFinderContext>) => state.context.rootBranchCell?.id;
const currentCellSelector = (state: AnyState<MazePathFinderContext>) => state.context.currentCell?.id;

const DebugPathFinder = ({ actor, paintMaze }: { actor; paintMaze: () => void }) => {
    const rootBranchCell = useSelector(actor, rootBranchCellSelector);
    const currentCell = useSelector(actor, currentCellSelector);

    const gridDisplayRef = useRef<Array<[MazeCell, MazeCell["display"]]>>(null);
    const resetDisplay = () => {
        gridDisplayRef.current.forEach(([cell, display]) => (cell.display = display));
        gridDisplayRef.current = null;
        paintMaze();
    };
    const saveDisplay = () => {
        const state = actor.state as AnyState<MazePathFinderContext>;
        gridDisplayRef.current = [];
        state.context.grid.flat().forEach((cell) => gridDisplayRef.current.push([cell, cell.display]));
    };

    useKey("m", () => {
        // Clunky toggle between previous display & forced display
        if (gridDisplayRef.current) return resetDisplay();

        const state = actor.state as AnyState<MazePathFinderContext>;
        saveDisplay();

        // Mark branchCells visually for easier debugging
        const branchCells = state.context.pathCells.filter((cell) => getPathNeighbors(cell).length > 2);
        branchCells.forEach((cell) => (cell.display = "mark"));
        paintMaze();
    });

    useKey("l", () => {
        // Clunky toggle between previous display & forced display
        if (gridDisplayRef.current) return resetDisplay();
        saveDisplay();

        const state = actor.state as AnyState<MazePathFinderContext>;

        // Mark paths that are not branchCells visually for easier debugging
        const paths = state.context.pathCells.filter((cell) => getPathNeighbors(cell).length <= 2);
        paths.forEach((cell) => (cell.display = "blocked"));
        paintMaze();
    });

    return (
        <>
            <DebugPathFinderState actor={actor} />
            <span>
                root: {rootBranchCell} / currentCell: {currentCell}
            </span>
        </>
    );
};

const DebugPathFinderState = ({ actor }) => {
    const state = useSelector(actor, (state: AnyState<MazePathFinderContext>) => printFinalStatesPath(state));

    return <span>{state}</span>;
};
