# Cevris Plot 0.8.0 — file-only Windows deployment

- Unpack the pinned official R EXE with innoextract; never execute Inno Setup or fall back to registry-writing installation.
- Reuse external Node/R and explicitly selected R libraries; save app-local configuration for later CLI/web launches.
- Prefer Node/OpenSSL for archives and CRAN packages; support preloaded Node/R/extractor archives and offline retries. Pin runtime SHA-256 independently of mirror checksum-page availability.
- Use the supplied frontend; disable npm lifecycle scripts, reuse matching dependencies, and retain a complete frontend if an explicitly requested rebuild fails.
- Configurable installation directory; optional shortcuts; transcript logs, bounded child processes, staging validation, cache cleanup and serialized repeat installation. No default pause or modal installer.
- Remove the fixed 2 GB disk-space gate; show an estimate based on missing components. See [installation guide](docs/INSTALLATION.md).
- Add a local DSH/agent Skill registration helper and a configurable directory for tool-enabled Doubao hosts. Client-specific end-to-end certification remains pending; see [host guide](docs/AGENT_HOSTS.md).

# Cevris Plot 0.7.2 — download recovery

- Retry interrupted transfers, including TLS disconnections, up to three times; then try the Windows download client with normal certificate validation.
- Every runtime and release archive remains checksum-verified before installation. Failed downloads return a nonzero exit status and can be retried.
- Windows installation and launcher wrappers preserve failures instead of reporting success after a pause.
- The installer checks for 2 GB of free space and supports an alternate destination.

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
