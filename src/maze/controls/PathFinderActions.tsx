import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { useSelector } from "@xstate/react";
import { useControls } from "leva";
import { useEffect } from "react";
import { ActorRefFrom } from "xstate";

import { useArrayCursor } from "@/functions/useArrayCursor";
import { useKey } from "@/functions/useKey";
import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";

import { MazePathFinderContext, createPathFinderMachine } from "../mazePathFinderMachine";
import { createPathMergerMachine } from "../mazePathMergerMachine";
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

    const merger = useSelector(finder, (state) => state.children.merger) as ActorRefFrom<
        ReturnType<typeof createPathMergerMachine>
    >;

    // Subscribe to merger updates & repaint maze each time
    useEffect(() => {
        if (!merger) return;

        const sub = merger.subscribe((next) => {
            paintMaze();
            // console.log(next.value);
        });
        return sub.unsubscribe;
    }, [merger]);

    useEffect(() => {
        paintMaze();
    }, []);

    const [index, cursor] = useArrayCursor(showCellsOptions.length, 0);
    useKey("l", cursor.next);
    useEffect(() => set({ showCells: showCellsOptions[index] }), [index]);

    const [, set] = useControls(() => ({
        showCells: {
            label: "Show Cells",
            options: showCellsOptions,
            value: "none",
            onChange: (value) => {
                if (merger) {
                    return merger.send({ type: "SetDisplay", value });
                }

                send({ type: "SetDisplay", value });
            },
        },
    }));

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
            {isDone ? (
                merger ? (
                    <PathMergerActions merger={merger} paintMaze={paintMaze} />
                ) : null
            ) : (
                <DebugPathFinder finder={finder} paintMaze={paintMaze} />
            )}
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
