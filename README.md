# portfolio-animations-experiments

## Just One More Pixel

A tiny browser game: nudge the square until it looks perfectly centred, then submit to see how far off you were. Three rounds, about 30 seconds.

- `index.html`, `styles.css`, `game.js` — plain HTML, CSS and JavaScript. No build step, no dependencies.
- Run it by opening `index.html`, or serve the folder: `python3 -m http.server 8000`.
- Embed it with an iframe, e.g. `<iframe src="index.html" width="640" height="640" title="Just One More Pixel"></iframe>`.

### Checks

`node tests/verify.js` drives the game in headless Chromium (requires [Playwright](https://playwright.dev)) and verifies movement, dragging, clamping, scoring, reveal geometry, round flow, resizing, keyboard scoping and mobile layout. Set `SHOTS=<dir>` to also save screenshots.
