## What is this

no idea i'm mostly just trying it out things with r3f
Currently there is:

-   devtools using [`leva`](https://github.com/pmndrs/leva)
-   [Camera Controls](https://github.com/astahmer/r3f-experiment/blob/main/src/components/CameraControls.tsx) / infos using [Orbit/MapControls](https://threejs.org/docs/#examples/en/controls/OrbitControls)
-   [Custom gravity provider](https://github.com/astahmer/r3f-experiment/blob/main/src/components/Gravity.tsx)
-   [useKeyControls/useMouseControls](https://github.com/astahmer/r3f-experiment/blob/main/src/functions/useKey.ts)
-   [useVelocity/usePosition/useRotation/useMassRef](https://github.com/astahmer/r3f-experiment/blob/main/src/functions/useVelocity.ts)
-   [Player Machine with Xstate](https://github.com/astahmer/r3f-experiment/blob/main/src/functions/playerMachine.tsx)
-   [Player Box](https://github.com/astahmer/r3f-experiment/blob/main/src/components/PlayerBox.tsx)
-   [Trampoline](https://github.com/astahmer/r3f-experiment/blob/main/src/components/Trampoline.tsx) bumps the player in air, only when he lands on the top surface of the trampoline, also subject to the closest (custom) gravity
-   [Pack](https://github.com/astahmer/r3f-experiment/blob/main/src/components/Pack.tsx) : basically <group> but for [`useBox`](https://github.com/pmndrs/use-cannon)
-   [a maze generator](https://github.com/astahmer/r3f-experiment/blob/main/src/maze/mazeMachine.ts) using a (configurable) [Growing tree algorithm](https://weblog.jamisbuck.org/2011/1/27/maze-generation-growing-tree-algorithm#)

> Made from [vite-r3f template](https://github.com/astahmer/vite-r3f)

## Using

Front SPA with:

-   Framework: [React](https://github.com/facebook/react) 17.0.2 / Typescript 4.3+
-   Dev server / builder: [Vite](https://github.com/vitejs/vite/)
-   Router: [React-Router](https://github.com/ReactTraining/react-router/)
-   State-management: Global state with
    [Jotai](https://github.com/pmndrs/jotai/) + Complex state with
    [XState](https://github.com/statelyai/xstate)
-   API: [axios](https://github.com/axios/axios) +
    [react-query](https://github.com/tannerlinsley/react-query)
-   Forms: [React-Hook-Form](https://github.com/react-hook-form/react-hook-form/)
-   CSS / Styling: CSS-in-JS using
    [Chakra-UI](https://github.com/chakra-ui/chakra-ui) with `Box` etc
-   Websockets:
    [native WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
