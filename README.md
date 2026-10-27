# NOCTURNE MOTORS — Japanese Legends

A complete static dealership concept for eight Japanese icons. Published at https://cojucaridumitru.github.io/nocturne/ through GitHub Pages (`main`, repository root). This replaces the original NOCTURNE audiovisual landing page while retaining its film and original Web Audio experience.

## Pages and interactions

- Cinematic homepage and featured collection with drivetrain tabs.
- Full catalogue: make, maximum budget, drivetrain, availability, decade, body, maximum mileage, minimum power, model/engine search, favourites-only and six sorting options. Russian aliases such as «супра», «скайлайн» and «хачироку» work alongside English names. Filter state is shareable in the hash URL; grid/list preference persists.
- Eight vehicle detail pages: photos with lightbox, specifications, model history, pre-purchase questions, related cars and share link.
- Persistent favourites and comparison of up to three cars. Add/reorder cars, show only differing specifications, share the comparison, export CSV, or print/save a PDF through the browser print dialog.
- Personal garage: pinned/favourite models, individual status, 0–5 rating, autosaved notes, last eight viewed models, up to 12 saved searches and eight budget scenarios.
- Five-question preference finder with explained scores, budget constraints and a saved result. The score measures preference matching, not vehicle quality.
- Editable purchase/ownership planner: purchase, transport, inspection, reserve, annual mileage, consumption, fuel price, insurance, maintenance and other expenses. Shows purchase, first-year, annual, monthly and three-year arithmetic; save, share or export a scenario.
- Per-model 12-item personal inspection checklist, progress, open questions, shared garage notes and downloadable observations.
- Garage JSON backup and merge import, with version/size validation. Existing notes and saved records take precedence; recent view timestamps are retained. Contact request drafts are excluded from the backup.
- Global keyboard search (Ctrl/⌘ + K), arrow-key navigation and quick vehicle previews.
- Selection, inspection, delivery and trade-in information with FAQ.
- A validated request form, vehicle preselection, preferred date/time, device-local drafts, deletion and UTF-8 text export.
- Photo credits and manufacturer reference links.
- Responsive navigation, native dialogs, keyboard-operable tabs, reduced motion and preserved original night-drive film.

## Honest demo scope

This is an interactive dealership concept, not a live inventory or an actual seller. Prices, mileage and availability are illustrative. Photos represent the model and can differ from the named year, market or trim. Factory specifications are reference values.

**Requests are stored only in the visitor's browser and can be downloaded. They are not sent to a dealership, do not confirm an appointment or reservation, and do not collect payments.** No real dealer contact details were supplied. A real lead workflow needs a separately configured receiving service or backend and the dealer's details. No private credentials belong in frontend code.

Garage data also stays in the browser (`nocturne-workbench-v1`); there is no account or cross-device sync. Export a backup to transfer it. The original `nocturne-motors-v1` favourites, comparison and request drafts are preserved. Budget inputs are user assumptions, with a demo vehicle price as the only prefilled monetary amount; no current fuel prices, taxes, credit terms, depreciation or resale forecasts are supplied.

## Source

`index.html` contains persistent page shells and dialogs; `app.js` handles routes, catalogue, comparison and request drafts; `cars.js` is the editorial demo inventory. `tools-core.js` contains pure filtering, matching, arithmetic, CSV and backup validation; `workbench.js` adds the garage, finder, planner, checklist and dialogs through the core route/event API. `workbench.css` styles these features. `style.css` is the dealership design; `experience.js` and `experience.css` retain the original film/audio and shared motion preferences. Assets are local, with no third-party runtime dependency.

Start any static server at the repository root, for example `python -m http.server 8080`. Hash routes work under the GitHub Pages project prefix without rewrites. `.nojekyll` serves files directly. Changes to `main` publish automatically.

## Attribution

Model photography: Wikimedia Commons; each author, file page and license is recorded in `assets/cars/credits.json` and displayed on `#/credits`. Original image bytes are retained; CSS crops images for display. Font notices are in `assets/FONT-LICENSES.txt`. The night-drive hero is original generated artwork; see `ASSET_NOTES.md`.

## Verification

Run `node --test tests/tools-core.test.cjs` (Node 18+) for eight domain tests covering aliases, combined filters, preference ranking, hand-checked ownership arithmetic, numeric bounds, backup sanitization, CSV escaping and model-specific checklist entries. JavaScript syntax and asset references are checked separately.

Browser QA covers notes/status/rating persistence; alias command search; advanced mileage/body/power filters; list view and quick preview; saved searches; the complete five-question flow and resumed results; a saved/reopened €57,000 first-year budget; persisted checklist progress/questions; shared comparison state, difference-only rows and column ordering; downloaded CSV and JSON content; merge import preserving newer notes and rejection of the wrong backup format. Mobile layouts at 320/390 CSS pixels have no page overflow; the mobile search closes navigation before opening its dialog. Original request/favourites/credits flows were checked in the dealership release. Product assets and deployment are verified at publication.
