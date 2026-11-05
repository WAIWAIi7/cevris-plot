# Development and contributions

This repository contains the Cevris Plot R-first application and Skill.

1. Install on Windows x64 with `first-install.cmd`. It installs a private Node 24 runtime, R and locked JavaScript dependencies. Other platforms are not yet validated.
2. Build with `node scripts/build.mjs` and start with `node server/index.mjs`.
3. Run `node --test tests/*.test.mjs`. Full tests need R and its dependencies. Import-only checks can run without R: `node --test tests/import.test.mjs tests/data.test.mjs`.
4. For changes to a chart, run `node scripts/verify-r.mjs` and visually inspect its actual exported SVG/PNG, not just the browser's temporary preview.
5. Run `node scripts/package.mjs` for the installable Skill, and `node scripts/package.mjs --source` for a clean GitHub source archive. Each package prints its size and SHA-256 and checks for private paths/files.

Before a release, run `npm run check:release` and `node scripts/verify-r-source.mjs`. After building the final archive, `node scripts/make-installer.mjs OWNER/cevris-plot` creates a version-pinned Windows installer containing that archive's SHA-256. Changing the archive requires regenerating the installer. Publish both files under the matching `vVERSION` release tag; never reuse an installer with another archive.

Every chart needs its input contract, English synthetic data, R rendering, localized controls, and input/export validation. Scientific computations must be explicit. Do not silently discard missing values, invent significance, or reinterpret paired samples as independent observations.

UI: retain the mist-blue palette, restrained motion, clear focus states, Chinese/English parity, and progressive disclosure of advanced settings. Do not translate imported identifiers. Defaults are Times New Roman and linewidth 0.5 in ggplot units.

Do not commit `.data`, `.runtime`, `node_modules`, generated output, logs, model credentials, or real experimental data. Use synthetic fixtures for issues and tests. The source distribution excludes them by allowlist in addition to `.gitignore`. The repository is MIT licensed; downloaded runtimes, dependencies and locally installed fonts retain their own licenses and are not bundled in source archives.

The package is marked `private` to prevent accidental npm publication; this does not prevent GitHub hosting or open-source distribution. GitHub Actions has not yet been run in a remote repository; local validation is not a claim of hosted CI success.
