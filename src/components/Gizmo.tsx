import { GizmoHelper, GizmoViewcube, GizmoViewport } from "@react-three/drei";

export function Gizmo() {
    return (
        <>
            <GizmoHelper alignment="bottom-right" margin={[80, 80]} onUpdate={noop}>
                <GizmoViewport disabled hideNegativeAxes scale={35} position={[-40, -40, -40]} />
                <GizmoViewcube opacity={0.85} />
            </GizmoHelper>
        </>
    );
}

const noop = () => {};
