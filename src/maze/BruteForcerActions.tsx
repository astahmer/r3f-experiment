import { Button } from "@chakra-ui/button";
import { HStack } from "@chakra-ui/layout";
import { useSelector } from "@xstate/react";

import { AnyState, printFinalStatesPath } from "@/functions/xstate-utils";

import { MazeBruteForcerContext } from "./mazePathBruteForceMachine";

const isDoneSelector = (state: AnyState) => state.matches("done");
const isAutoSelector = (state: AnyState<MazeBruteForcerContext>) => state.context.mode === "auto";

export const BruteForcerActions = ({ actor }) => {
    const isDone = useSelector(actor, isDoneSelector);
    const isAuto = useSelector(actor, isAutoSelector);

    const send = actor.send;

    return (
        <>
            <HStack pointerEvents="all">
                <Button onClick={() => send("SOLVE_STEP")} isDisabled={isDone || isAuto}>
                    Visit Step
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || isAuto}>
                    Auto Visit
                </Button>
                <Button onClick={() => send("TOGGLE_MODE")} isDisabled={isDone || !isAuto}>
                    Pause solving
                </Button>
                <Button onClick={() => console.log(actor.state.context)}>Log bruteforce ctx</Button>
            </HStack>
            <DebugBruteForcer actor={actor} />
        </>
    );
};

const DebugBruteForcer = ({ actor }: { actor }) => {
    const rootCell = useSelector(actor, (state: AnyState<MazeBruteForcerContext>) => state.context.rootCell?.id);
    const lastBranch = useSelector(
        actor,
        (state: AnyState<MazeBruteForcerContext>) => state.context.lastBranchSnapshot?.currentCell?.id
    );
    const currentCell = useSelector(actor, (state: AnyState<MazeBruteForcerContext>) => state.context.currentCell?.id);

    return (
        <>
            <DebugBruteForcerState actor={actor} />
            <span>
                root: {rootCell} / lastBranch: {lastBranch} / currentCell: {currentCell}
            </span>
        </>
    );
};

const DebugBruteForcerState = ({ actor }) => {
    const state = useSelector(actor, (state: AnyState<MazeBruteForcerContext>) => printFinalStatesPath(state));

    return <span>{state}</span>;
};
