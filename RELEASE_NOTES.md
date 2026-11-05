# Cevris Plot 0.7.1 — preview

- Unified the project, Skill and archive name as Cevris Plot / `cevris-plot`; preserved existing project schemas and browser drafts.
- Owner-curated homepage: 011, 035, 054, 058, 071, 073, 077, 102. Legacy empty preferences now use these defaults; personal saved choices remain intact.
- Manhattan demo: 24,000 synthetic variants across 12 chromosomes, local association clusters and smaller points. Imported measurements are never padded or duplicated.
- Standalone R export handles large embedded tables efficiently and preserves Unicode under Windows source locales.
- Agent-created projects now inherit the selected template's visual defaults, matching the browser's starting point.
- Added compressed-XLSX expansion checks; increased the bounded project request allowance to accommodate original data plus editable copies.
- Windows invokes the actual R interpreter, so a render timeout or shutdown does not leave a wrapper's computation running.
- Added Skill metadata, repository CI, contribution templates and release package checks.
- Added a checksum-verified standalone Windows installer, automatic browser launch and a current-user Start Menu shortcut. Runtime downloads retry interrupted transfers and fall back across official CRAN mirrors.
- CSV export also neutralizes negative formula-like text while preserving negative numeric measurements.

## Scope

105 R templates (including visual variants), 28 palettes, Chinese/English interface, local data input, style reuse, compositions up to 12 panels, SVG/PDF/PNG/TIFF, editable JSON, and standalone R source. The manual workflow works offline after dependencies have been installed.

Windows x64 is the supported installation target. macOS/Linux installation, arbitrary free-position layouts, a web-embedded AI chat, full transcriptomics preprocessing, and universal consumer-chat Skill installation are not promised. Prism export has been removed.

See SECURITY.md for the current dependency findings. GitHub Actions is supplied but must run in the actual remote repository before hosted CI can be described as passing.

Local verification evidence and its limits are recorded in [release checks](docs/RELEASE_CHECKS.md).
