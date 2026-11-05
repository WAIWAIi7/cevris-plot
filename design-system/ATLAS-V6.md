# Chart-first Mist Studio

User direction: a chart library as the landing page, morphology categories, direct entry into editing, Chinese/English interfaces, English sample figures, a smaller figure on a larger canvas. The project name remains provisional.

- Tokens: canvas `#E8EFF5`, navigation `#EFF4F8`, panels `#F0F5F9`, rail `#203D53`, emphasis `#315F7D`, text `#213B50`. No gradients or pure-white application background.
- Typography: local system sans for controls; Times New Roman in sample scientific figures. No remote font dependencies. One restrained heading scale; large space is reserved for graphs.
- Structure: compact global rail; chart-type sidebar; categorized specimen cards. Search, favorites and recents stay secondary. No welcome screen, marketing hero or persistent detail drawer. Clicking a card opens its English demo directly.
- Editor: data context, large stage, smaller centered sheet, six parameter groups. Title/legend and X/Y details use progressive disclosure. Numeric sliders retain precise inputs and reset. Zoom affects viewing only.
- Motion: professional and calm; 140 ms feedback and 220 ms transitions with `cubic-bezier(.2,0,0,1)`. A two-pixel card lift is the only decorative motion. No stagger delay across 103 cards. Reduced-motion users get immediate state changes.
- Interaction: semantic buttons, keyboard focus, native disclosure controls, labeled inputs, persisted language choice, distinct live/exact preview state. Mobile categories scroll horizontally and the editor stacks vertically.

Skills applied: frontend-design, ui-ux-pro-max, motion-design. The dashboard search supported restrained data density, filtering and hover/focus feedback. Its enterprise marketing recommendations and remote fonts were rejected as irrelevant. The screenshots inform category organization, not copied styling or code.

Validate real page screenshots in both languages, click-to-edit, zoom, independent axis changes, uploaded-data preservation, image download and small-screen overflow. Numerical and image exports are verified separately from UI appearance.

## Raincloud refinement / 0.6.1

Retain the existing fog-blue tokens, local UI font and Times New Roman figures. Make raincloud plots a visible morphology category beside box/violin; accept both Chinese word orders in search. Three real specimen cards lead directly to vertical, horizontal or grouped-panel examples. Controls follow the scientific composition: density cloud, box summary and raw observations, each in its own disclosure panel. Shared appearance remains above these controls. No additional navigation layer or hero is introduced.

Separate component opacity from measurement coordinates. A fixed jitter seed and spacing based on lane extents keep observations in their own groups. Scientific validation precedes rendering: density requires variation in each cell, quartile definitions are recorded, and box outliers remain visible when raw points are hidden. This refinement uses frontend-design for interface organization and scientific-visualization for data-integrity review; sources are credited in the README.

## Import and export refinement — 0.6.2

Keep the mist-blue palette. A two-column import dialog pairs the current chart’s actual sample rows and field meanings with one file picker. Show file constraints before selection; reveal preparation rules on demand. Keep parsing failures inline, retain the chosen file, support encoding and worksheet retry, and do not replace the project until confirmation. The data page has one replacement entry, with detailed upload help collapsed. Remove repeated engine/status prose from rails and footers. Export hints explain vector vs raster choices. Maintain Chinese/English parity, keyboard modal escape and responsive single-column layout.

## Palette library — 0.6.3

Apply scientific-visualization principles: discrete groups, monotonic sequential lightness, neutral-centered diverging scales. Retain four existing presets and add sixteen original categorical palettes plus eight gradients. No accessibility or journal certification is implied. Use four quick cards and a searchable, responsive library dialog to preserve the compact inspector. Preview gradients are swatches, not decorative UI backgrounds. Both languages share stable palette IDs; actual color values persist through the existing undo, project and R export pipeline. Do not alter measurements, thresholds or normalization when changing colors.
