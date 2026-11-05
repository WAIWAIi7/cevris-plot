# Third-party components and references

Cevris Plot's own code is licensed under MIT. Dependency and runtime licenses are separate; installing a dependency does not change its license.

The JavaScript lockfile records exact installed package versions, integrity hashes and licenses. Direct components include React (MIT), Lucide (ISC), Zod (MIT), ExcelJS (MIT), csv-parse (MIT), fflate (MIT), esbuild (MIT), Prettier (MIT), and saxes (ISC). Transitive packages retain their own notices in their npm distributions. Cevris Plot does not relicense them.

The application uses R and R packages including ggplot2, jsonlite, svglite, systemfonts, ragg, MASS, survival and hexbin. R is GPL licensed; package-specific licenses and versions can be queried with `packageDescription()` / `packageVersion()`. R and these packages are downloaded from official distribution sources at installation time, and are not included in the source or Skill archives. Node.js is likewise downloaded with its original license and notices.

Times New Roman and other system fonts are not redistributed. The user must have the selected font installed; the renderer reports the actual font and fails when the requested family is missing.

The supplied ChiPlot screenshots were used as navigation and interaction references; competitor code and screenshots are not distributed. Scientific presentation principles and implementation references are listed in the README, compatibility notes and design-system reference documents. References are not endorsements or claims of journal certification. Repository images show this project's own interface and synthetic examples.
