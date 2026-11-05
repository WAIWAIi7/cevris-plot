args <- commandArgs(FALSE)
script <- sub("^--file=", "", args[grepl("^--file=", args)])
root <- normalizePath(file.path(dirname(script), ".."), mustWork=TRUE)
lib <- file.path(root, ".runtime", "library")
dir.create(lib, recursive=TRUE, showWarnings=FALSE)
# Match the isolated runtime: do not mistake another user's/global library for
# packages that will be available when the local server sets R_LIBS_USER.
.libPaths(c(lib, .Library), include.site=FALSE)
options(repos=c(CRAN="https://cloud.r-project.org"), timeout=600)
packages <- c("ggplot2", "jsonlite", "svglite", "systemfonts", "ragg", "MASS", "survival", "hexbin")
for (attempt in 1:2) {
  missing <- packages[!vapply(packages, requireNamespace, logical(1), quietly=TRUE)]
  if (!length(missing)) break
  # Let R install dependencies in dependency order on an empty library.
  try(install.packages(missing, lib=lib, dependencies=NA,
      type=if (.Platform$OS.type=="windows") "binary" else "source"), silent=FALSE)
}
stopifnot(all(vapply(packages, requireNamespace, logical(1), quietly=TRUE)))
versions <- as.list(setNames(vapply(packages, function(x) as.character(packageVersion(x)), ""), packages))
jsonlite::write_json(list(R=as.character(getRversion()), packages=versions), file.path(root, ".runtime", "versions.json"), pretty=TRUE, auto_unbox=TRUE)
cat("R runtime ready\n")
