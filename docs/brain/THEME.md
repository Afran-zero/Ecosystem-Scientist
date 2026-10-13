# Visual theme plan: "Field journal in honey and walnut"

Status: **built** on 2026-10-13. Decisions: the lab uses the walnut surface; body text uses Pixelify Sans; titles, buttons and labels use Jersey 10 (chosen by rendering six candidate pixel fonts side by side). Build notes are at the end of this file.

## 1. The idea

The game is a field scientist's notebook on a small island. The interface should feel like the
pages and the wooden case of that notebook: cream paper, honey-yellow highlights, brown ink and
walnut frames. Buttons and headings look pixelated, like the island art, but long text stays
readable. The island itself keeps its own colours. The theme frames it; it does not repaint it.

Three words to check every screen against: **warm, pixel, legible.**

## 2. Palette

All colours become tokens on `:root` in `src/app/globals.css`. No screen uses a raw hex value.

| Token | Hex | Role |
|---|---|---|
| `--cream` | `#FFF4D6` | Page and panel paper |
| `--parchment` | `#F6E3B4` | Raised panels, table headers, hover |
| `--honey` | `#F2C14E` | Primary buttons, focus, highlights |
| `--golden` | `#E0A526` | Pressed or active honey, sliders |
| `--soil` | `#A0692E` | Secondary accents, chart axis lines |
| `--brown` | `#7A4E2D` | Frames, borders, secondary buttons |
| `--walnut` | `#4A2F1B` | Dark frames, lab background panels |
| `--ink` | `#2B1A0E` | Darkest tone: shadows, text on honey |
| `--ink-text` | `#3B2412` | Body text on cream |
| `--muted` | `#7F5F3C` | Secondary and disabled text |
| `--moss` | `#5E7D3A` | Success marks only (a muted green from the island's grass) |
| `--rust` | `#B5532A` | Errors and warnings only |

### Contrast (WCAG 2.x, measured)

| Text | On | Ratio | Passes AA (4.5:1) |
|---|---|---|---|
| `--ink-text` `#3B2412` | `--cream` | 13.2 : 1 | yes |
| Heading `#4A2A12` | `--parchment` | 10.2 : 1 | yes |
| `--ink` on `--honey` (button text) | `--honey` | 10.0 : 1 | yes |
| `--ink` on `--golden` | `--golden` | 7.6 : 1 | yes |
| `--cream` on `--brown` | `--brown` | 6.5 : 1 | yes |
| `--honey` on `--ink` (headings on dark) | `--ink` | 10.0 : 1 | yes |
| `--muted` `#7F5F3C` | `--cream` | 5.3 : 1 | yes |
| `--muted` | `--parchment` | 4.6 : 1 | yes |

Rejected: `#A8906F` for disabled text (2.8 : 1). It looked washed out and fails AA. Disabled
controls use `--muted` plus a dotted outline, so they are still readable.

## 3. Typography

Three free fonts, all under the SIL Open Font Licence (OFL). Each gets a licence file in
`public/assets/LICENSES/`, as the plan requires for every asset.

| Use | Font | Why |
|---|---|---|
| Titles, dialog headings, big numbers | **Press Start 2P** | The most clearly pixel face. Use only at 16 px or more. |
| Buttons, tabs, chips, HUD labels, table headers | **Silkscreen** | Pixel caps that stay legible at 12 to 14 px. |
| Body text, descriptions, field notes | **Pixelify Sans** | Pixel feel with normal letter shapes, so paragraphs are readable. |

Rules:
- Pixel fonts look best with their edges kept sharp. Set `-webkit-font-smoothing: none` (macOS
  only; other browsers ignore it), and use whole-pixel font sizes. Check the result on a
  screenshot, because browsers differ on how they smooth text.
- Sizes are multiples of 4 px for body and 8 px for titles, so pixel edges line up.
- Body text is never all caps. Only buttons, tabs and chips use caps.
- Line height 1.6 for body, 1.2 for titles. Minimum body size 16 px.
- Self-host the `.woff2` files in `public/assets/fonts/`. Do not load them from Google Fonts at
  build time. Self-hosting keeps the game working offline and matches how the sprite assets are
  handled. Fallback stack: `"Pixelify Sans", "Trebuchet MS", system-ui, sans-serif`.

## 4. Pixel UI kit

Each element is built with CSS only, so it scales with no blur. Sprites keep
`image-rendering: pixelated`.

- **Frames.** A panel has a 4 px brown outer frame, a 2 px walnut inner shadow, and a notched
  corner made with stepped `box-shadow` (no `border-radius`). The corner shape is the pixel signature.
- **Buttons.** Honey fill, ink text, a 4 px ink bottom shadow. Hover: lighter honey. Pressed: the
  button moves down 4 px and the shadow goes, so it looks pushed in. Focus: a 2 px dotted honey
  outline. Secondary buttons use parchment with a brown frame. Disabled: dotted outline in
  `--muted`, no shadow, cursor `not-allowed`.
- **Tabs.** Raised pixel tabs. The active tab is joined to the panel below it, with no gap.
- **Chips.** Small square-cornered tags with a 2 px brown border. Species chips show a 12 px
  sprite icon from the Tiny Creatures sheet.
- **Inputs.** Cream fill with an inset 2 px brown border. Invalid: rust border and a rust
  pixel marker before the message.
- **Sliders.** A 6 px brown track with stepped ends. The thumb is a square 12 px honey block
  with an ink outline. It replaces the browser's round thumb.
- **Tables.** Parchment header row, dotted row dividers, numbers right-aligned in Silkscreen.
- **Dialogs.** Parchment panel over a walnut dimmed backdrop, with a title bar in honey. The close
  control is a small pixel "x" button.
- **Icons.** Drawn with Pillow in `tools/`, the way the trees were, so they are ours and match the
  pixel size. Starter set: lab flask, journal book, map pin (missions), house (hub), speaker
  (later), "E" key cap, joystick.
- **Cursor.** The default pointer stays. A custom pixel cursor is out of scope.

## 5. Screen by screen

| Screen | Change |
|---|---|
| Main menu | Cream paper background with a walnut frame around the hero image. Title in Press Start 2P, honey with an ink shadow. Buttons become the honey pixel style. About and How to play sit in two parchment panels. |
| Missions list | Mission cards become parchment panels with a brown frame. The status chip is honey (done), parchment (in progress) or dotted (not started). |
| Field journal | Species cards as parchment panels. The undiscovered card keeps its silhouette with a dotted frame. |
| Island HUD (top bar) | Walnut bar with cream text. Species counts as small honey-framed chips. Objectives strip below. |
| Island itself | No change to the map art. A thin walnut border frames the canvas. |
| Touch controls | Joystick: brown ring with a honey knob. E button: honey octagon with an ink "E". |
| Dialogs (animal, briefing, results) | Parchment panels. Animal sprite in a walnut frame. Subtitle strip is an ink panel with cream text, like a game caption. |
| Research lab | Walnut overlay with parchment panels for each section. Tabs as described above. Charts keep their data colours, retuned for the paper look (below). |
| Charts | Background cream; grid lines `--parchment`; axis labels `--muted`. Species colours: rabbit honey, cow ink-grey, chicken rust-orange, mouse taupe, fox brick red, grass moss, births moss, deaths rust, eaten golden. Each must still be told apart without colour: solid for "now", dashed for "base" (already done). |

Decision still open: the lab could stay walnut-dark or switch to cream paper. The default in this
plan is walnut, because the charts stand out better on it. Section 9 asks you.

## 6. Motion

- Dialogs open in three steps (scale 60%, 80%, 100%), using `steps(3)`, not smooth easing.
- Buttons press with no transition. Hover changes colour only, instantly.
- The menu entrance keeps the current fade-and-rise, but in four steps.
- `prefers-reduced-motion` turns all of this off, as it already does for the menu.

## 7. Accessibility

- Every text pair meets 4.5:1 (section 2). A test will check this automatically (section 8).
- Focus is always visible (dotted honey outline, 2 px).
- The pixel font is never the only way to tell a state apart: states also use a text label or
  icon. Example: a locked control has a "Locked" note, not just a faded look.
- Pixel fonts are harder to read at small sizes. Nothing is set below 12 px, and Silkscreen is
  limited to uppercase labels of 12 to 14 px.
- Touch targets are at least 44 px.

## 8. How it will be built and checked

**Build order**

1. Tokens and fonts: `globals.css` variables, `@font-face` for the three fonts, licence files.
2. Primitives: `Button`, `Panel`, `Chip`, `Tab`, `Field` (input), `Slider`, `Dialog`, `Table`.
   The old `eco-*` classes are rewritten on top of these, so existing screens change in one place.
3. Screens in this order: main menu, missions list, field journal, island HUD and dialogs, lab.
4. Chart colours in `charts.tsx`, from the token list.
5. Icons drawn in `tools/make_ui_icons.py`, with a manifest entry in `docs/memory/ASSETS.md`.

**Automated checks (to add)**

- `tests/theme/contrast.test.ts`: reads the token values from `globals.css` and asserts every
  pair in section 2 is at least 4.5:1. If a token changes and breaks a pair, the test fails.
- Playwright screenshots of the menu, missions, journal, island, dialog, lab Overview and lab
  Results, saved to `assets/previews/theme-*.png`, for a human to review each change.
- A mobile check at 390 px wide: no horizontal scroll on any screen, touch targets 44 px.

**Done when**

- Every screen uses only theme tokens (a search for raw hex values outside `globals.css` finds nothing).
- The contrast test passes.
- The three fonts load from `public/assets/fonts/` with no network request to Google.
- The screenshots have been looked at and approved.
- `npm run check` and the Playwright suite still pass.

## 9. Questions for you before building

1. **Lab background:** walnut-dark (default in this plan) or cream paper?
2. **How much pixel font:** should paragraphs use Pixelify Sans (default), or only titles and
   buttons, with normal body text? The default is more on-theme, but long paragraphs are slower to read.
3. **Font choice:** happy with Press Start 2P, Silkscreen and Pixelify Sans, or do you have a pixel font in mind?
4. **Icons:** should I draw the starter icon set, or leave icons out for now?

## 10. What does not change

- Game logic, the simulation, the saves, and the tests.
- The island map art and the animal sprites.
- Text content. Only how it looks.

## 11. Build notes (2026-10-13)

- **Fonts:** Jersey 10 (titles, buttons, tabs, labels) and Pixelify Sans (body text), self-hosted in `public/assets/fonts/`, with OFL licence files in `public/assets/LICENSES/`. Press Start 2P, Silkscreen and VT323 were rejected after comparing renders: Press Start reads as arcade, VT323 as a terminal.
- **Two surfaces:** `.paper` (cream page) for the menu, the mission list and the journal. `.ink-zone` (parchment dialogs) flips light text to ink. The dark surface (walnut) is the default for the island HUD, the lab and the game frame. Components keep one set of class names; the surface decides the colour.
- **Palette tokens:** `@theme` in `src/app/globals.css`. The class names in components use these tokens; the old slate, amber and emerald classes were remapped in one pass.
- **Rust on paper:** `#9A3F1E` (the first rust failed AA at 3.9:1 on parchment).
- **Checks:** `tests/theme/contrast.test.ts` reads the tokens and asserts 19 pairs at 4.5:1 or better, and it fails if a screen uses a raw hex colour outside the Phaser canvas and the in-game labels.
- **Screenshots:** `assets/previews/theme-*.png` (made by `tests/e2e/theme-shots.spec.ts`).
- **Found and fixed while reviewing:** the touch E button showed on desktop; opacity variants of text colours missed the paper overrides; the hero text sat over the image, so it now sits on a parchment card; ghost buttons on paper used cream text.

