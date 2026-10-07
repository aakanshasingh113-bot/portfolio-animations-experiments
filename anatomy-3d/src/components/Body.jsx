import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// A shared material so every body part looks the same.
// Tweak color / roughness here to change the whole figure's look.
function Skin(props) {
  return <meshStandardMaterial color="#e8e2da" roughness={0.45} metalness={0.05} {...props} />
}

/*
  PLACEHOLDER BODY
  ----------------
  A simple mannequin built from basic shapes (capsules + a sphere).
  Later, this whole component gets replaced by a real GLB model —
  see the comment at the bottom of this file.
*/
export default function Body() {
  const group = useRef()

  // useFrame runs every frame (~60x per second). We use it for the "breathing" motion.
  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Float gently up and down
    group.current.position.y = Math.sin(t * 0.8) * 0.06
    // Breathe: very slightly scale wider/deeper and back
    const breath = 1 + Math.sin(t * 1.2) * 0.012
    group.current.scale.set(breath, 1, breath)
  })

  return (
    <group ref={group}>
      {/* Head */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.22, 48, 48]} />
        <Skin />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.88, 0]}>
        <capsuleGeometry args={[0.07, 0.1, 8, 16]} />
        <Skin />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0.35, 0]} scale={[1, 1, 0.65]}>
        <capsuleGeometry args={[0.3, 0.55, 16, 32]} />
        <Skin />
      </mesh>

      {/* Arms (left & right) */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.42, 0.25, 0]} rotation={[0, 0, side * 0.12]}>
          <capsuleGeometry args={[0.08, 0.85, 8, 16]} />
          <Skin />
        </mesh>
      ))}

      {/* Legs (left & right) */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.14, -0.75, 0]}>
          <capsuleGeometry args={[0.11, 0.95, 8, 16]} />
          <Skin />
        </mesh>
      ))}
    </group>
  )
}

/*
  ------------------------------------------------------------------
  HOW TO SWAP IN A REAL HUMAN MODEL LATER
  ------------------------------------------------------------------
  1. Put your file here:   public/models/human.glb
  2. Replace the <group> contents above with:

       import { useGLTF } from '@react-three/drei'
       ...
       const { scene } = useGLTF('/models/human.glb')
       return <group ref={group}><primitive object={scene} /></group>

  3. Wrap <Body /> in <Suspense> inside Scene.jsx (models load async).
  ------------------------------------------------------------------
*/
