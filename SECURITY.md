# Security and release status

This is a local desktop-browser application. The server binds to `127.0.0.1`, checks request origins, and requires its local session token for data APIs. Do not expose it as a public hosted service. Data and project bundles remain user-controlled files; bundles include source data.

## Dependency review — 2026-11-04

Version 0.6.2 updates `csv-parse` to 7.0.3 and overrides ExcelJS's UUID dependency with 11.1.1, validated with CSV/Excel fixtures and the complete local test suite. These address [csv-parse GHSA-8cw4-87c7-c6xx](https://github.com/advisories/GHSA-8cw4-87c7-c6xx) and [UUID GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

`npm audit --omit=dev` currently reports **8 moderate, 0 high and 0 critical package entries**. The remaining dependency chain is ExcelJS → archiver/archiver-utils/readdir-glob/zip-stream/glob/rimraf → minimatch. These are propagated dependency entries, not eight distinct demonstrated exploits in the application. The underlying advisory is [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), involving pattern amplification. This app imports XLSX through the in-memory Workbook API and does not expose user-supplied filesystem glob patterns. That observation does not substitute for a complete security audit or dismiss the dependency finding.

The audit tool suggests downgrading ExcelJS or making incompatible transitive upgrades. Neither is applied blindly: Excel loading, formulas, dates and sheet selection need compatibility verification. Track an upstream compatible update or replace the XLSX adapter with equivalent tests before claiming a clean dependency audit. Source may be published as a development release with this finding disclosed; it is not certified secure or ready for public server deployment.

Source and Skill archives exclude `.data`, `.runtime`, installed dependencies, logs and verification files by allowlist. Packaging also scans common credential patterns and personal machine paths. Pattern scanning is not a complete secret-detection guarantee. Never attach private experimental data or tokens to public issues; use a minimal synthetic example.

If a repository is created, enable private vulnerability reporting there before inviting reports. No public contact address or reporting endpoint is configured in this local-only project yet.
