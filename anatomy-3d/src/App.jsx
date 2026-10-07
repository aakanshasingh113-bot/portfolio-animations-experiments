import Scene from './components/Scene.jsx'

// The top-level component: the full-screen 3D scene + the instruction overlay.
export default function App() {
  return (
    <>
      <Scene />
      <p className="hint">Hover over the body</p>
    </>
  )
}
