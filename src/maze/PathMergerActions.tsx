import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { useSelector } from "@xstate/react";

import { AnyState } from "@/functions/xstate-utils";

import { MazePathFinderContext } from "./mazePathFinderMachine";

const isDoneSelector = (state: AnyState) => state.matches("done");
const isAutoSelector = (state: AnyState<MazePathFinderContext>) => state.context.mode === "auto";

export const PathMergerActions = ({ actor, paintMaze }: { actor; paintMaze: () => void }) => {
    const send = actor.send;

    const isDone = useSelector(actor, isDoneSelector);
    const isAuto = useSelector(actor, isAutoSelector);
    console.log(actor.state.context);

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
                <Button onClick={() => console.log(actor.state.context)}>Log merge ctx</Button>
            </HStack>
        </>
    );
};
