import { parseProject, validateData, reconcileColors } from "./model.mjs";
import { parseComposition } from "./composition.mjs";
import { RENDERER_SOURCE } from "./runtime.mjs";

export function exportR(raw) {
  const composition = raw?.kind === "figure-composition";
  const project = composition
    ? parseComposition(raw)
    : reconcileColors(parseProject(raw));
  if (!composition) {
    const check = validateData(project);
    if (!check.ok) throw new Error(check.issues.join("; "));
  }
  // Pretty-print small projects; thousands of indented lines also slow Rscript's
  // incremental source reader. Large tables stay lossless in compact JSON.
  const pretty = JSON.stringify(project, null, 2);
  // ASCII JSON escapes preserve Chinese and supplementary Unicode characters
  // when Rscript is launched under a Windows non-UTF-8 source locale.
  const data = (
    pretty.length > 250000 ? JSON.stringify(project) : pretty
  ).replace(
    /[^\x00-\x7F]/g,
    (character) =>
      "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"),
  );
  // R raw strings may only use dashes as delimiters; grow until collision-free.
  let fence = "----";
  while (data.includes(")" + fence + '"')) fence += "-";
  // R's parser becomes very slow on a multi-megabyte raw string. Keep the
  // readable JSON intact, but parse bounded chunks and join them byte-for-byte.
  const chunks = [];
  for (let start = 0; start < data.length; ) {
    let end = Math.min(start + 16384, data.length);
    if (end < data.length) {
      const newline = data.lastIndexOf("\n", end);
      if (newline > start) end = newline + 1;
      else if (/[\uD800-\uDBFF]/u.test(data[end - 1])) end--;
    }
    chunks.push(`r"${fence}(${data.slice(start, end)})${fence}"`);
    start = end;
  }
  const dataExpression =
    chunks.length === 1
      ? chunks[0]
      : `character(${chunks.length})\n${chunks.map((chunk, i) => `figure_spec[${i + 1}] <- ${chunk}`).join("\n")}\nfigure_spec <- paste0(figure_spec, collapse = "")`;
  return `# Cevris Plot — standalone, editable R source\n# Contains the data, settings and actual plotting implementation.\n# Open in RStudio and Source, or run: Rscript figure.R\n# Requires R >= 4.1 and ggplot2, jsonlite, svglite, systemfonts, ragg, MASS, survival, hexbin.\n# Install packages separately if missing; this script never downloads anything.\n# The requested fonts must be installed. Output is written to the working directory.\n\noutput_file <- "${composition ? "composition" : "figure"}.svg"\noutput_format <- "svg" # svg, pdf, png or tiff\nfigure_spec <- ${dataExpression}\n\nlocal({\nfigure_library_mode <- TRUE\n# Actual R engine and all recipe functions follow; no web server is needed.\n${RENDERER_SOURCE}\ninput <- jsonlite::fromJSON(figure_spec, simplifyVector=FALSE)\noutput <- output_file\nformat <- output_format\nwarnings_seen <- character()\n${composition ? "render_composition()" : "render()"}\n})\n`;
}
