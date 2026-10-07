# portfolio-animations-experiments

## 01 — Magnetic button

A pill-shaped button that is drawn toward your cursor, stretches in its direction on hover, and turns into a "Done" circle when clicked. Click it again to undo.

**Files**
- `index.html`: the page structure
- `style.css`: the look, plus the pill → circle morph and the checkmark animation
- `script.js`: the cursor-following spring physics

**Run it:** double-click `index.html`, or run `python3 -m http.server 8000` in this folder and open http://localhost:8000.

**Experiment:** change the numbers in `SETTINGS` at the top of `script.js`, or the tokens in `:root` at the top of `style.css`, then refresh.

## 02 — Your Day, In Motion

A scroll-driven story of one person's day: Wake, Move, Focus and Reset. The whole day is one continuous world (bedroom → park → studio → terrace), and scrolling moves a camera sideways through it while the light changes from dawn to dusk.

**Files** (in `your-day-in-motion/`)
- `index.html`: the world, built in depth layers (far hills and city, middle trees, the set, a foreground leaf) plus the text
- `style.css`: how each scene is drawn and laid out
- `script.js`: turns scroll into progress (0 → 1), then works out the camera, the time of day, the walker and the text from it
- `images/`: the character and props, cut out from the illustration sheet. The walker is split into `walk-torso`, `walk-leg-back`, `walk-leg-front` and `walk-under` so her legs can move

**Run it:** double-click `your-day-in-motion/index.html`.

**Experiment:** the `camera`, `dolly`, `walk` and `COLORS` definitions near the top of `script.js` control the whole story. Each pair is `[progress, value]`.
