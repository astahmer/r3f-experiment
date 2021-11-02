import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { lerp } from "three/src/math/MathUtils";

import { cameraPosition } from "@/maze/utils";

export function Zoom() {
    const { zoom, position } = useControls({
        zoom: { value: 2, min: 0.4, max: 8, step: 0.2 },
        position: { x: cameraPosition[0], y: cameraPosition[1], z: cameraPosition[2] },
    });
    return useFrame((state) => {
        state.camera.position.set(position.x, position.y, position.z);
        state.camera.zoom = lerp(state.camera.zoom, zoom * 4, 0.1);
        state.camera.updateProjectionMatrix();
    });
}
