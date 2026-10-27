# NOCTURNE MOTORS — Japanese Legends

A complete static dealership concept for eight Japanese icons. Published at https://cojucaridumitru.github.io/nocturne/ through GitHub Pages (`main`, repository root). This replaces the original NOCTURNE audiovisual landing page while retaining its film and original Web Audio experience.

## Pages and interactions

- Cinematic homepage and featured collection with drivetrain tabs.
- Full catalogue: make, maximum budget, drivetrain, availability, decade, model/engine search, favourites-only and six sorting options. Filter state is shareable in the hash URL.
- Eight vehicle detail pages: photos with lightbox, specifications, model history, pre-purchase questions, related cars and share link.
- Persistent favourites and comparison of up to three cars. Compare price, mileage, year, engine, output, drivetrain, gearbox, body and status.
- Selection, inspection, delivery and trade-in information with FAQ.
- A validated request form, vehicle preselection, preferred date/time, device-local drafts, deletion and UTF-8 text export.
- Photo credits and manufacturer reference links.
- Responsive navigation, native dialogs, keyboard-operable tabs, reduced motion and preserved original night-drive film.

## Honest demo scope

This is an interactive dealership concept, not a live inventory or an actual seller. Prices, mileage and availability are illustrative. Photos represent the model and can differ from the named year, market or trim. Factory specifications are reference values.

**Requests are stored only in the visitor's browser and can be downloaded. They are not sent to a dealership, do not confirm an appointment or reservation, and do not collect payments.** No real dealer contact details were supplied. A real lead workflow needs a separately configured receiving service or backend and the dealer's details. No private credentials belong in frontend code.

## Source

`index.html` contains persistent page shells and dialogs; `app.js` handles routes, catalogue, comparison and request drafts; `cars.js` is the editorial demo inventory. `style.css` is the dealership design; `experience.js` and `experience.css` retain the original film/audio and shared motion preferences. Assets are local, with no third-party runtime dependency.

Start any static server at the repository root, for example `python -m http.server 8080`. Hash routes work under the GitHub Pages project prefix without rewrites. `.nojekyll` serves files directly. Changes to `main` publish automatically.

## Attribution

Model photography: Wikimedia Commons; each author, file page and license is recorded in `assets/cars/credits.json` and displayed on `#/credits`. Original image bytes are retained; CSS crops images for display. Font notices are in `assets/FONT-LICENSES.txt`. The night-drive hero is original generated artwork; see `ASSET_NOTES.md`.

## Verification

JavaScript syntax and asset references checked. Browser QA covered model/engine search, make filtering, price sorting, favourites, comparison, persistence after reload, vehicle history tabs, vehicle-to-request preselection, validated local request creation, successful downloaded request content, photo credits, and 390/320-pixel mobile layouts without page overflow. Product images and final publication are checked separately at deployment.
