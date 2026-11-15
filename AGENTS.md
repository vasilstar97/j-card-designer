# Agent instructions

## Project overview

- This is a browser-only React/Vite application. GitHub Pages serves the static build from `dist/`; there is no backend.
- Keep Vite's relative `base: "./"` setting so assets load from a GitHub Pages project site.
- React UI is in `src/components/` and `src/App.jsx`. Editor state and behavior are in `src/editor/`; shared styling is in `styles.css`.

## Product and implementation constraints

- `src/editor/constants.js` is the source of truth for panel dimensions and print margins. Dimensions are in millimeters; keep the preview and exported artwork consistent with those values.
- PDF export in `src/editor/pdfExport.js` lays out cards at print size on portrait A4 (two per page) or landscape A3 (four per page). Rasterization is 300 dpi. RGB mode preserves browser RGB values; CMYK mode uses an unprofiled generic conversion. Do not describe either as printer-profiled or color-accurate for a particular press without an ICC profile and conversion support.
- Project data is saved locally in IndexedDB by `src/editor/storage.js`; it is not synchronized to a server.
- Keep image-file and image-URL validation in `src/editor/images.js`. URL imports require an image MIME type and CORS access, and the 20 MB limit should remain enforced.
- Use the existing React, Ant Design, and CSS patterns. Avoid adding dependencies unless the feature requires them.

## Development and verification

- Use Node.js 22.12 or later. Run `npm ci` to install dependencies, `npm run dev` for local development, and `npm run build` to validate production output. Use `npm run preview` to inspect the built site.
- There is currently no automated test script. For UI or export behavior changes, run the production build and verify the affected behavior in a browser when practical.
- Keep `package-lock.json` in sync when changing dependencies. Do not commit generated `dist/` output or `node_modules/`.

## Deployment

`.github/workflows/deploy.yml` builds on pushes to `main` and on manual workflow dispatch, then publishes `dist/` to the `gh-pages` branch. Preserve this branch and workflow contract when changing deployment configuration.
