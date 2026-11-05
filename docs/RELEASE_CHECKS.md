# Cevris Plot 0.7.1 release checks

Local validation completed on Windows x64 on 2026-11-04–05. Synthetic data was used throughout.

| Area | Evidence |
| --- | --- |
| Regression | 69 automated tests pass, including import errors, missing data, scientific calculations, palette/category stability, HTTP workflows, save conflicts, recovery, composition and source export. |
| Chart catalog | All 105 templates render through R using a new render-cache directory; English example labels, Times New Roman and default ggplot linewidth 0.5 are checked. |
| Standalone R | All 105 exported R scripts execute independently of the application and preserve their observation counts. |
| Exports | SVG, PDF, PNG and TIFF are exercised for single figures and compositions; exported R and reproducibility bundles are rerun. |
| Browser import | A two-sheet XLSX with an empty first sheet loads the correct sheet; all 72 values/identifiers in six categories are compared with the original workbook. |
| Browser editing | Chinese/English homepage, selected eight recommendations, raincloud palette/linewidth, zoom and same-template composition sync are exercised. |
| Browser export | The downloaded raincloud SVG is byte-identical to the independent output of its downloaded R script. The downloaded five-panel composition R script reruns, preserving the uploaded panel's 72 observations. |
| Fresh installation | A source archive is unpacked into an empty directory. Official Node 24.22.2 and R 4.6.2 are downloaded and checksummed, JavaScript/R packages installed, interface built and all 105 charts rendered. |
| Fresh startup | The clean installation starts its own local server; the home page, session identity and health endpoint report Cevris Plot 0.7.1 with R ready and 105 templates. |
| Windows compatibility | Installation is also rerun through Windows PowerShell 5.1. R package versions are recorded locally; fresh ggplot2 version is 4.0.3. |
| Runtime recovery | A timed-out R job stops its interpreter and a subsequent queued job succeeds. |
| Source release | Allowlist, version consistency, documentation links, file sizes and common credential/personal-path patterns are checked. Private data and installed runtimes are excluded. |
| Skill | Skill frontmatter validation passes; CLI-generated projects inherit the selected template's defaults. |

## Limits of these checks

- This is a preview release, not a certification or exhaustive security audit. The dependency scan reports 8 moderate entries and no high/critical entries; see [SECURITY.md](../SECURITY.md).
- macOS/Linux installation and consumer chat-client integrations have not been validated. The Linux CI job checks source-level behavior only.
- The full installer was exercised headlessly in a clean directory. Hosted release downloads and the final one-click shortcut/browser handoff require the published release; their status must not be inferred from this table.
- GitHub-hosted CI results must be checked on the actual repository. Local tests alone do not establish that hosted checks passed.
- SVG/font behavior depends on installed fonts. Package versions are recorded but R package downloads are not frozen by an R lockfile.

To repeat: `npm test`, `npm run verify:r`, `node scripts/verify-r-source.mjs`, `npm run check:release`. See [CONTRIBUTING.md](../CONTRIBUTING.md) for setup.
