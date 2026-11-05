args <- commandArgs(FALSE)
script <- sub("^--file=", "", args[grepl("^--file=", args)])
root <- normalizePath(file.path(dirname(script), ".."), mustWork=TRUE)
lib <- file.path(root, ".runtime", "library")
dir.create(lib, recursive=TRUE, showWarnings=FALSE)
external <- strsplit(Sys.getenv("FIGURE_R_LIBS"), .Platform$path.sep, fixed=TRUE)[[1]]
external <- external[nzchar(external) & dir.exists(external)]
.libPaths(c(lib, external, .Library), include.site=FALSE)
options(repos=c(CRAN="https://cloud.r-project.org"), timeout=180)
packages <- c("ggplot2", "jsonlite", "svglite", "systemfonts", "ragg", "MASS", "survival", "hexbin")
missing <- packages[!vapply(packages, requireNamespace, logical(1), quietly=TRUE)]
if (length(missing) && Sys.getenv("CEVRIS_OFFLINE") == "1")
  stop("Offline: missing R packages: ", paste(missing, collapse=", "), ". Supply -RLibrary with an already prepared library.")
node <- Sys.getenv("CEVRIS_NODE", Sys.which("node"))
download_openssl <- function(url, destination) {
  if (nzchar(node)) {
    status <- system2(node, vapply(c(file.path(root, "scripts", "download.mjs"), url, destination), shQuote, ""), stdout="", stderr="")
    if (status != 0L) stop("Node/OpenSSL download failed: ", basename(destination))
  } else download.file(url, destination, mode="wb", quiet=TRUE)
}
if (length(missing) && .Platform$OS.type == "windows") {
  # Fetch the index and binaries through OpenSSL too; never execute an R installer.
  repository <- contrib.url(getOption("repos"), type="win.binary")
  cache <- file.path(root, ".runtime", "cache", "r-packages")
  dir.create(cache, recursive=TRUE, showWarnings=FALSE)
  index <- file.path(cache, "PACKAGES.rds")
  download_openssl(paste0(repository, "/PACKAGES.rds"), index)
  available <- readRDS(index)
  deps <- unique(c(missing, unlist(tools::package_dependencies(missing, db=available,
    which=c("Depends", "Imports", "LinkingTo"), recursive=TRUE), use.names=FALSE)))
  deps <- deps[!vapply(deps, requireNamespace, logical(1), quietly=TRUE)]
  absent <- setdiff(deps, rownames(available))
  if (length(absent)) stop("No Windows binary available: ", paste(absent, collapse=", "))
  archives <- character()
  for (package in deps) {
    row <- available[package, ]
    archive <- file.path(cache, paste0(package, "_", row[["Version"]], ".zip"))
    expected <- row[["MD5sum"]]
    valid <- file.exists(archive) && !is.na(expected) && identical(unname(tools::md5sum(archive)), expected)
    if (!valid) download_openssl(paste0(repository, "/", basename(archive)), archive)
    if (!is.na(expected) && !identical(unname(tools::md5sum(archive)), expected))
      stop("R package checksum mismatch: ", package)
    archives <- c(archives, archive)
  }
  if (length(archives)) {
    install.packages(archives, lib=lib, repos=NULL, type="win.binary")
    # Some CRAN Windows indexes omit archive MD5. The HTTPS download still
    # receives the package's file manifest; verify that manifest after unpacking.
    for (package in deps) {
      if (!isTRUE(tools::checkMD5sums(dir=file.path(lib, package))))
        stop("Installed R package file verification failed: ", package)
    }
  }
} else if (length(missing)) {
  install.packages(missing, lib=lib, dependencies=NA)
}
missing <- packages[!vapply(packages, requireNamespace, logical(1), quietly=TRUE)]
if (length(missing)) stop("Required packages still unavailable: ", paste(missing, collapse=", "))
versions <- as.list(setNames(vapply(packages, function(x) as.character(packageVersion(x)), ""), packages))
jsonlite::write_json(list(R=as.character(getRversion()), packages=versions), file.path(root, ".runtime", "versions.json"), pretty=TRUE, auto_unbox=TRUE)
cat("R runtime ready\n")
