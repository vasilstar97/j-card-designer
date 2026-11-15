# J-card Cover Designer

A browser-based editor for designing cassette J-cards, with a live preview and print-ready A4/A3 PDF export. The app is built with React, Vite, and Ant Design and is deployed as a static site on GitHub Pages.

## Run locally

Requires Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Run `npm run build` to generate the production site in `dist/`, or `npm run preview` to inspect that build locally. Open Sans and Noto Sans JP are loaded from Google Fonts.

## Edit designs

- The left sidebar contains release settings, a five-color palette, and Text, Accent, and Background color controls. Those three design colors are arranged in three columns and show their hex values; each color picker also has a screen eyedropper.
- Choose or drop a cover image or image URL in the cover area, or paste an image or URL from the clipboard. URLs are imported only if they return an image, must allow CORS requests, and are limited to 20 MB. Cover art is automatically center-cropped to fit the square front panel; the crop position is not currently adjustable. Set **Cover feather (mm)** between Artist and the image upload to fade the left, bottom, and right edges; `0` disables it.
- Use the tabs above the preview to create and switch between multiple J-cards. Tab names follow the album title. Each card has its own settings and track lists.
- Use the 2D/3D toggle in the preview footer, to the left of the visibility checkboxes, to switch between the flat layout and a rotatable cassette-case mockup. Printed panels are opaque; only the plastic shell is translucent. The inner insert sits on the reverse side of the front panel, and the back panel meets the spine as one continuous strip; their reverse sides are light gray. Drag to rotate. The 3D view is for visualization; PDF export uses the flat print layout.
- Each side starts with six track rows. Add or remove rows as needed, and use the Accent checkbox to highlight a track. Empty rows are omitted from the artwork.
- **Cover feather (mm)** defaults to `0` and fades the cover image into the background along its left, bottom, and right edges.
- Designs are automatically saved in IndexedDB in the current browser on the current device. They are not synchronized between browsers or devices.

## Print and export

Download PDF exports all open designs, with additional pages added as needed:

- **A4:** portrait pages with two J-cards stacked vertically.
- **A3:** landscape pages with four J-cards in a 2×2 layout.

Choose **RGB (sRGB)** or **CMYK (generic)** beside the paper-size selector. RGB is selected by default and preserves the browser-rendered color values more closely; ask the print shop to convert RGB using its own profile. Generic CMYK uses an unprofiled mathematical conversion and may look less saturated. Neither mode includes a printer-specific ICC profile.

Cards retain their real print size and are separated by a 10 mm gap. Padding and bleed are fixed at 3 mm. The preview footer contains grid, padding guide, and fold/cut visibility toggles; fold and cut marks are always included in the PDF, extending 3 mm beyond the bleed with a line thickness of 0.5 mm. Filenames include the current date, paper size, and color mode, for example `j-card-15-11-26-A4-RGB.pdf`. PDF artwork is rasterized in the browser at 300 dpi with a white background around each card's print marks.

## Source structure

- `src/components/` contains the release settings, preview, track editor, and color controls.
- `src/App.jsx` coordinates the application UI and workspace state.
- `src/editor/controller.js` connects form and browser events to artwork and export modules.
- `src/editor/artwork.js`, `tracks.js`, `images.js`, `storage.js`, `printRaster.js`, and `pdfExport.js` handle SVG rendering, track rows, image loading, local project storage, print rasterization, and sheet PDF generation.
- `src/editor/constants.js` holds panel dimensions, print margins, and default colors.
- `styles.css` contains the application layout and component styles.

## GitHub Pages deployment

The `.github/workflows/deploy.yml` workflow builds the app and publishes `dist/` to the separate `gh-pages` branch on each push to `main`, or when manually started from GitHub Actions. In repository settings, choose **Settings → Pages → Deploy from a branch**, then select `gh-pages` and `/(root)`. The workflow uses `GITHUB_TOKEN` with permission to write repository contents.
