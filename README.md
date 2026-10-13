# Electricity & Payroll Dashboard

Single-file dashboard (`index.html`, served by GitHub Pages) built from the layered sources in `src/`.

```
python3 build.py          # src/  ->  index.html
node --test tests/        # unit tests for the VIPER layers (Node 18+, no dependencies)
python3 tools/mkdict.py   # rebuild the Indonesian / Spanish dictionary from src/i18n/dict_*.txt
```

## Architecture

The page is one `<script>` scope, so layers are plain files concatenated in a fixed order (`build.py`, `APP_FILES`).
A layer may only use layers listed before it.

| Folder | Role |
|---|---|
| `src/core/` | App shell: `engine.js` (electricity maths), `i18n.js`, `app.js` (module registry), `router.js` (deep links, opening sheets), `pager.js` (page navigation) |
| `src/modules/<name>/` | Self-contained **VIPER** modules. Each has a `manifest.json` listing its files |
| `src/legacy/` | The original screens, split by section but unchanged. Migrate one at a time into `modules/` |
| `src/styles/` | `legacy.css` plus one `mod-<name>.css` per module |
| `src/data/`, `src/i18n/` | Embedded electricity data and translation dictionaries |
| `tests/` | Node tests, no browser needed |

### VIPER in this project (`src/modules/admits/`)

| Part | File | Knows about | Must not |
|---|---|---|---|
| **Entity** | `entity.js` | Site, status, quadrant rules (pure functions) | touch DOM, format text |
| **Interactor** | `interactor.js` | Use cases: summary, counts, list, concern, scatter. Reads data through a gateway | format text, know the screen |
| **Presenter** | `presenter.js` | Screen state and the ViewModel (text, tones, ordering). Handles view events | touch DOM |
| **View** | `view.js` | Draws a ViewModel, forwards clicks and typing | decide anything |
| **Router** | `router.js` | Where to go next (daily chart sheet, section) via `core/router.js` | reach into other screens |
| Builder | `builder.js` | The only place the five parts are wired together | |

Data flows one way: `View event -> Presenter -> Interactor -> Entity`, then `Presenter -> ViewModel -> View.render`.
Because Entity, Interactor and Presenter are plain JavaScript, `tests/admits.test.js` covers them without a browser.

### Navigation

`core/pager.js` shows one section at a time: a main bar with a few page groups and a sub bar for the sections in the active group.
Groups are listed at the top of the file (`GROUPS`). A section that does not exist for the current data (for example Month to Month without
history) disappears from the bar on its own, because the pager reads the `hidden` flag of the original section buttons.
`#admits`, `#sites` and similar addresses open that page directly.

### Adding a module

1. Create `src/modules/<name>/` with the five parts, `builder.js` and a `manifest.json`.
2. Add a `<section id="s-<name>"></section>` and a hidden source button in `#nav` in `src/index.template.html`, then list the section in `Pager` `GROUPS`.
3. Call `App.register({ name, refresh })` from the builder so the module redraws on theme, language and data changes.
4. Add translations to `src/i18n/dict_*.txt` and run `tools/mkdict.py`.

## Data notes (Admits vs kWh)

`src/modules/admits/data.js` holds Sep 2025 and Sep 2026 admits (Man Hour Usage sheet, all formats) and invoice kWh
(Actual Invoice Electricity, main meters times CT) for 59 sites. Sites without data in a year show `null`, never 0.
