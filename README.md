# nova-s-custom-drills

React-based program editor and Bluetooth controller for the Pongbot Nova S Pro.

## Local development

```bash
npm install
npm run build
```

This bundles a publishable site into `dist/`, including:

- `dist/index.html`
- `dist/js/main.js`
- `dist/src/style.css`

If you're deploying with GitHub Pages, point the publish directory at `dist/`.

Programs are stored in `localStorage` as JSON under `nova-programs-json-v1`.
