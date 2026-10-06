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

A scroll-driven story in four chapters: Wake, Move, Focus and Reset. The visuals stay pinned to the screen (a sticky stage) while the text scrolls past, and every animation is tied to how far you've scrolled.

**Files** (in `your-day-in-motion/`)
- `index.html`: the stage layers and the four chapters of text
- `style.css`: layout, type and the starting colours
- `script.js`: turns scroll position into progress (0 → 1) and moves everything along keyframe "tracks"

**Run it:** double-click `your-day-in-motion/index.html`.

**Experiment:** edit the keyframes in `buildTracks()` and `COLORS` in `script.js`. Each `at:` value is a point in the scroll, from 0 (the start) to 1 (the end).
