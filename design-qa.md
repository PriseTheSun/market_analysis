# Workspace selector — visual QA

final result: passed

## Comparison

- Source: `/Users/erik/Downloads/Dropdown de workspaces com badges compactos.png` (1374 × 1145).
- Render: `output/design-qa/workspace-desktop.jpg` at 1374 × 1145 CSS pixels, device scale factor 1, Portuguese, light theme, Clients tab, Global selected and menu open.
- Focused comparison: `output/design-qa/workspace-comparison.png`. Source dropdown normalized from 602 px to the application's 400 px dropdown width; implementation shown at native size.
- Scope: workspace selector only. Existing sidebar, header branding and management table remain the product's existing layout.

## Findings — pass 1

- P2: At equal dropdown width, agency/client names, counts and avatars are smaller than the reference. Client rows are also tighter, reducing the hierarchy and readability. Increase row text from 14 to 16 px, badges from 11 to 12 px, avatars from 32 to 36 px and minimum row height from 48 to 54 px. Recapture and compare.

## Pass 2 — resolved

- Applied the P2 typography and sizing changes, including 24 px agency icons and 14 px search and group labels.
- Recaptured `workspace-desktop.jpg` and regenerated `workspace-comparison.png` with source and implementation together. The normalized source panel is about 613 px tall; the implementation is 608 px. No remaining actionable P0/P1/P2 findings.
- Recaptured `workspace-mobile.jpg` after the fix, at 390 × 844. The menu is 366 px wide, contains both agency groups, and stays within the viewport.
- Also checked 320 × 568: the menu fits within 12 px side margins, with internal list scrolling (360 px visible / 504 px content). Selecting the last client successfully opens Cobalto.

## Required fidelity surfaces

- Fonts and typography: retained the app's Montserrat family, with 16 px title and row text, semibold agency/global names, regular client names and 12 px pills. Text is readable, aligned and wraps when necessary. Minor font-shape differences from the reference are accepted to preserve the existing product typography.
- Spacing and layout: 400 px desktop panel, 16 px padding, 54 px rows, indented clients, separators, 12 px rounded container and existing elevation token. Width is deliberately adapted from the 602 px source to the scale of the existing header. Relative spacing now follows the normalized reference. The surrounding application is outside this request's scope.
- Colors and tokens: existing blue primary/selection colors, white surface, muted group labels and neutral counts; pale purple client badges with a corresponding dark-theme style. Palette differences are intentional use of existing theme tokens. Dark mode styles were reviewed in code, not visually tested.
- Image quality and assets: existing Lucide building, shield, search and check icons match the reference's outline style. Client initials remain selectable UI text within avatar components; no raster artwork or new imagery is required.
- Copy and content: title, search placeholder, section label, agency names, client names and compact count/type badges follow the reference. Search, empty-results copy and count labels are translated into Portuguese, English and Spanish; Portuguese was verified in-browser.

## Validation already completed

- Search supports accented agency names, case-insensitive client matches and empty results.
- Keyboard: text editing, ArrowDown navigation, Tab back to search, Escape and focus restoration.
- Agency management and client navigation work. Vite dependency cache was refreshed and local API restarted after an unrelated local module-loading failure.
- Mobile viewport 390 × 844: no horizontal overflow; current client has highlight and check.
- TypeScript, ESLint, production build and 14 workspace unit tests pass.
- No new browser console errors after restarting local services and retesting agency/client navigation.
- Existing E2E selectors were updated for direct agency access and expanded client groups. The full E2E suite was not run; browser interaction verification used the Codex in-app browser.

## Final checklist

- [x] Visual comparison after the P2 fix.
- [x] Search, keyboard navigation, agency and client selection.
- [x] Mobile fit and scrolling to the last result.
- [x] Typecheck, lint, unit tests and production build.
- [x] Default viewport restored; preview kept open at the Clients management tab with dropdown open.
- Final evidence: `output/design-qa/workspace-final.jpg`.
