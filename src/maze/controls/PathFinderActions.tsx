import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { useSelector } from "@xstate/react";
import { useControls } from "leva";
import { useEffect, useRef } from "react";
import { ActorRefFrom } from "xstate";

import { useArrayCursor } from "@/functions/useArrayCursor";
import { useKey } from "@/functions/useKey";
import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";

import { MazeCell } from "../mazeGeneratorMachine";
import { MazePathFinderContext, createPathFinderMachine, getPathNeighbors } from "../mazePathFinderMachine";
import { PathMergerActions } from "./PathMergerActions";

const isDoneSelector = (state: AnyState) => state.matches("done");
const isAutoSelector = (state: AnyState<MazePathFinderContext>) => state.context.mode === "auto";

export const PathFinderActions = ({
    finder,
    paintMaze,
}: {
    finder: ActorRefFrom<ReturnType<typeof createPathFinderMachine>>;
    paintMaze: () => void;
}) => {
    const send = finder.send;
    const isDone = useSelector(finder, isDoneSelector);
    const isAuto = useSelector(finder, isAutoSelector);

    const merger = useSelector(finder, (state) => state.children.merger);

    useEffect(() => {
        if (!merger) return;

        const sub = merger.subscribe(() => paintMaze());
        return sub.unsubscribe;
    }, [merger]);

    return (
        <>
            <HStack pointerEvents="all">
                <Button onClick={() => send("FINDER_STEP")} isDisabled={isDone || isAuto}>
                    Find Step
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || isAuto}>
                    Auto find
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || !isAuto}>
                    Pause pathfinding
                </Button>
                <Button onClick={() => console.log(finder.state.context)}>Log find ctx</Button>
            </HStack>
            <DebugPathFinder finder={finder} paintMaze={paintMaze} />
            {isDone && merger && <PathMergerActions merger={merger} paintMaze={paintMaze} />}
        </>
    );
};

const rootBranchCellSelector = (state: AnyState<MazePathFinderContext>) => state.context.rootBranchCell?.id;
const currentCellSelector = (state: AnyState<MazePathFinderContext>) => state.context.currentCell?.id;

const DebugPathFinder = ({
    finder,
    paintMaze,
}: {
    finder: ActorRefFrom<ReturnType<typeof createPathFinderMachine>>;
    paintMaze: () => void;
}) => {
    const rootBranchCell = useSelector(finder, rootBranchCellSelector);
    const currentCell = useSelector(finder, currentCellSelector);

    const resetDisplay = () => {
        normalDisplayRef.current.forEach(([cell, display]) => (cell.display = display));
        paintMaze();
    };

    // Mark cells visually for easier debugging
    const showBranchCells = () => {
        resetDisplay();
        const branchCells = finder.state.context.pathCells.filter((cell) => getPathNeighbors(cell).length > 2);
        branchCells.forEach((cell) => (cell.display = "mark"));
        paintMaze();
    };

    const normalDisplayRef = useRef<Array<[MazeCell, MazeCell["display"]]>>([]);
    useEffect(() => {
        paintMaze();

        finder.state.context.grid.flat().forEach((cell) => normalDisplayRef.current.push([cell, cell.display]));
    }, []);

    const [index, cursor] = useArrayCursor(showCellsOptions.length);
    useKey("l", () => {
        cursor.next();
        set({ showCells: showCellsOptions[index] });
    });

    const [, set] = useControls(() => ({
        showCells: {
            label: "Show Cells",
            options: showCellsOptions,
            value: "none",
            onChange: (v) => {
                if (v === "none") return resetDisplay();
                // if (v === "paths") return showPathCells();
                if (v === "branchCells") return showBranchCells();
            },
        },
    }));

    return (
        <>
            <DebugPathFinderState finder={finder} />
            <span>
                root: {rootBranchCell} / currentCell: {currentCell}
            </span>
        </>
    );
};

const showCellsOptions = ["none", "branchCells"];

const DebugPathFinderState = ({ finder }) => {
    const state = useSelector(finder, (state: AnyState<MazePathFinderContext>) => printFinalStatesPath(state));

    return <span>{state}</span>;
};
