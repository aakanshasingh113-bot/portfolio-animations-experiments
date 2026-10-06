# portfolio-animations-experiments

## 01 — Magnetic button

A pill-shaped button that is drawn toward your cursor, stretches in its direction on hover, and turns into a "Done" circle when clicked. Click it again to undo.

**Files**
- `index.html`: the page structure
- `style.css`: the look, plus the pill → circle morph and the checkmark animation
- `script.js`: the cursor-following spring physics

**Run it:** double-click `index.html`, or run `python3 -m http.server 8000` in this folder and open http://localhost:8000.

**Experiment:** change the numbers in `SETTINGS` at the top of `script.js`, or the tokens in `:root` at the top of `style.css`, then refresh.
