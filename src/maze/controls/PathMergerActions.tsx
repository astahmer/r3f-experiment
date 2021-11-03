import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { useSelector } from "@xstate/react";
import { ActorRefFrom } from "xstate";

import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";

import { MazePathMergerContext, createPathMergerMachine } from "../mazePathMergerMachine";

const isDoneSelector = (state: AnyState) => state.matches("done");
const isAutoSelector = (state: AnyState<MazePathMergerContext>) => state.context.mode === "auto";

export const PathMergerActions = ({ merger, paintMaze }: { merger; paintMaze: () => void }) => {
    const send = merger.send;

    const isDone = useSelector(merger, isDoneSelector);
    const isAuto = useSelector(merger, isAutoSelector);

    return (
        <>
            <HStack pointerEvents="all">
                <Button onClick={() => send("MERGER_STEP")} isDisabled={isDone || isAuto}>
                    Merge Step
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || isAuto}>
                    Auto merge
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || !isAuto}>
                    Pause pathmerging
                </Button>
                <Button onClick={() => console.log(merger.state.context)}>Log merge ctx</Button>
            </HStack>
            <DebugPathMerger merger={merger} paintMaze={paintMaze} />
        </>
    );
};

const DebugPathMerger = ({
    merger,
    paintMaze,
}: {
    merger: ActorRefFrom<ReturnType<typeof createPathMergerMachine>>;
    paintMaze: () => void;
}) => {
    const currentVector = useSelector(merger, (state) => state.context.currentVector?.[3]);
    const nextVector = useSelector(merger, (state) => state.context.nextVector?.[3]);

    return (
        <>
            <DebugPathMergerState merger={merger} />
            <span>
                root: {currentVector} --- nextVector: {nextVector} ---
            </span>
        </>
    );
};
const DebugPathMergerState = ({ merger }) => {
    const state = useSelector(merger, (state: AnyState<MazePathMergerContext>) => printFinalStatesPath(state));

    return <span>{state}</span>;
};
