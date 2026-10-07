import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import Body from './Body.jsx'

// Scene = the 3D "stage": camera, lights, controls, and the body model.
export default function Scene() {
  return (
    <Canvas
      // Camera sits 5 units in front of the body, looking at the center
      camera={{ position: [0, 0, 5], fov: 40 }}
      // alpha: transparent canvas so the CSS gradient shows behind it
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]} // sharp on retina screens, capped for performance
    >
      {/* ---------- LIGHTING ---------- */}
      {/* Soft base light everywhere, so shadows are never pure black */}
      <ambientLight intensity={0.3} />
      {/* Main "key" light from the upper front-right */}
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      {/* Cool "rim" light from behind to outline the silhouette */}
      <directionalLight position={[-4, 2, -5]} intensity={0.8} color="#8fb4ff" />
      {/* Subtle studio reflections, built from glowing panels (no file download needed) */}
      <Environment resolution={256} environmentIntensity={0.4}>
        <Lightformer form="rect" intensity={2} position={[0, 4, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1} position={[-5, 1, -2]} scale={[2, 6, 1]} />
      </Environment>

      {/* ---------- THE MODEL ---------- */}
      <Body />

      {/* Soft shadow on an invisible floor, grounds the figure */}
      <ContactShadows position={[0, -1.6, 0]} opacity={0.4} scale={6} blur={2.5} far={3} />

      {/* ---------- INTERACTION ---------- */}
      {/* Drag to rotate, scroll to zoom. Panning off to keep the body centered. */}
      <OrbitControls
        enablePan={false}
        enableDamping // smooth, eased movement
        minDistance={2.5}
        maxDistance={9}
      />
    </Canvas>
  )
}
