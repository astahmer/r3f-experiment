import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { useSelector } from "@xstate/react";

import { AnyState } from "@/functions/xstate-utils";

import { MazePathFinderContext } from "./mazePathFinderMachine";

const isDoneSelector = (state: AnyState) => state.matches("done");
const isAutoSelector = (state: AnyState<MazePathFinderContext>) => state.context.mode === "auto";

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
        </>
    );
};
