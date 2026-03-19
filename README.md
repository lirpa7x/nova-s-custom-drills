# nova-s-custom-drills

React-based program editor and Bluetooth controller for the Pongbot Nova S Pro.

## Local development

```bash
npm install
npm run build
```

This build writes:

- `index.html` in the repo root, which loads built assets from `dist/`
- `dist/index.html`
- `dist/js/main.js`
- `dist/src/style.css`

For a root-based GitHub Pages deploy, commit both the root `index.html` and the `dist/` folder.

Programs are stored in `localStorage` as JSON under `nova-programs-json-v1`.
