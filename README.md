# NOCTURNE — After Dark

Cinematic interactive night-drive website created for Waxent. Russian interface, kinetic typography, three audiovisual edits and an original synthesized soundtrack.

## Run locally

Serve this directory with any static HTTP server, for example:

```sh
python -m http.server 8080
```

Open http://localhost:8080. No build step or dependencies are required.

## GitHub Pages

Publishing source: **Deploy from a branch**, branch **main**, folder **/(root)**. The `.nojekyll` file ensures the files are served directly. Paths are relative so the site works beneath its repository URL.

Push updates to `main` to publish a new version automatically.

## Experience

- Midnight Run, Redline and Slow Motion: three 15-second animated cuts.
- Original Web Audio rhythm at 128, 160 and 86 BPM. Sound starts only after a user click.
- Scroll reveals, moving typography, parallax, film grain and canvas speed trails.
- Mobile layout, keyboard controls and a persistent reduced-motion toggle.
- Local assets and fonts; no third-party runtime, tracking or login.

## Assets

The original generated hero photograph is in `assets/night-drive.png`; provenance is in `ASSET_NOTES.md`. Font licenses are in `assets/FONT-LICENSES.txt`.

## Checks

JavaScript syntax and assets checked. Desktop and 320/390 CSS-pixel mobile layouts, mode entry points, sound toggle, modal focus/close and completed edit were checked in a browser.
