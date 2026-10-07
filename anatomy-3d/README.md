# Anatomy 3D — experiment v1

A full-screen interactive 3D scene with a (placeholder) human body.
Drag to rotate, scroll to zoom. Anatomy interactions come later.

## Run it locally

```bash
cd anatomy-3d
npm install      # first time only — downloads React, Three.js, etc.
npm run dev      # starts the dev server
```

Then open the URL it prints (usually http://localhost:5173).
Edits to files in `src/` show up in the browser instantly.

## File map

| File | What it does |
| --- | --- |
| `index.html` | The single HTML page. Has an empty `<div id="root">` React fills in. |
| `src/main.jsx` | Entry point. Mounts `<App />` into the page. |
| `src/App.jsx` | Top-level layout: the 3D scene + the "Hover over the body" text. |
| `src/styles.css` | Full-screen sizing, gradient background, instruction text style. |
| `src/components/Scene.jsx` | The 3D stage: camera, lights, shadow, drag/zoom controls. |
| `src/components/Body.jsx` | The body itself (placeholder shapes) + the floating/breathing animation. |
| `public/models/` | Where the real `human.glb` file will go. |

## Adding a real model later

Drop a GLB file at `public/models/human.glb`, then follow the instructions
at the bottom of `src/components/Body.jsx`.
