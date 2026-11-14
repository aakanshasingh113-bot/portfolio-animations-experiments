# portfolio-animations-experiments
## Experiments

### [Last Momo](last-momo/)

A quick showdown against a cheeky computer opponent over a shared plate of momos.
Take 1 or 2. Whoever takes the last momo wins.

Plain HTML, CSS and JavaScript: no build step, no dependencies, no network requests.

- **Play:** open `last-momo/index.html` in a browser, or serve the folder
  (`python3 -m http.server --directory last-momo 8000`).
- **Embed:** `<iframe src="last-momo/index.html" title="Last Momo" style="width:100%;height:640px;border:0"></iframe>`.
  It stacks in portrait frames and goes side by side in landscape frames from 600 px wide.
- **Files:** `logic.js` holds the rules and state machine (pure functions), `game.js` renders
  from that state and runs effects and sound, `styles.css` holds the illustration and motion.
- **Tests:** `node --test last-momo/tests/logic.test.js` for the rules, and
  `node last-momo/tests/e2e.js` for browser checks (needs Playwright with Chromium).
