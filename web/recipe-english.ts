export const englishNames: Record<string, string> = {
  raincloud: "Vertical raincloud",
  raincloud_horizontal: "Horizontal raincloud",
  grouped_raincloud: "Grouped raincloud",
  bar: "Bar + observations",
  bar_plain: "Simple bar",
  bar_error: "Bar + error bars",
  bar_horizontal: "Horizontal bar",
  bar_horizontal_points: "Horizontal bar + points",
  bar_outline: "Outline bar",
  bar_sorted: "Sorted bar",
  bar_labels: "Labeled bar",
  grouped_bar: "Grouped bar + errors",
  grouped_bar_plain: "Grouped bar",
  grouped_bar_points: "Grouped bar + points",
  grouped_bar_horizontal: "Horizontal grouped bar",
  grouped_stacked_bar: "Grouped stacked bar",
  bar_line: "Bar + reference line",
  grouped_box: "Grouped box plot",
  grouped_violin: "Grouped violin",
  circular_bar: "Circular bar",
  binary_heatmap: "Binary heatmap",
  correlation_bubble: "Correlation bubble matrix",
  circular_heatmap: "Circular heatmap",
  pca: "PCA scores",
  pca_biplot: "PCA biplot",
  loading: "PCA loadings",
  scree: "PCA scree plot",
  kaplan_meier: "Kaplan–Meier survival",
  survival: "Supplied survival curve",
  roc: "ROC curve",
  precision_recall: "Precision–recall curve",
  qq: "Normal Q–Q",
  ma: "MA plot",
  bland_altman: "Bland–Altman",
  density2d: "2D density contours",
  bin2d: "2D bin heatmap",
  dot_matrix: "Expression dot matrix",
  mean_interval: "Mean + interval",
  paired: "Paired trajectories",
  strip: "Grouped observations",
  forest: "Supplied effect intervals",
  upset: "UpSet intersections",
  oncoprint: "Categorical state matrix",
  network: "Circular network",
  alluvial: "Three-stage alluvial",
  sankey: "Two-stage Sankey",
  dendrogram: "Hierarchical dendrogram",
  polar_histogram: "Directional rose",
  percent_bar: "100% stacked bar",
  histogram_density: "Histogram + density",
  dotplot: "Stacked dot plot",
  ridgeline: "Ridgeline density",
  funnel: "Effect funnel",
  residual: "Residual diagnostic",
  waterfall: "Ranked waterfall",
  hexbin: "Hexagonal bins",
  gantt: "Interval Gantt",
  swimmer: "Follow-up swimmer",
  rarefaction: "Individual rarefaction",
  volcano: "Volcano plot",
  box: "Box plot",
  scatter: "Scatter plot",
  line: "Line plot",
  bubble: "Bubble plot",
  violin: "Violin plot",
  enrichment: "Enrichment bubbles",
};
export const englishDescriptions: Record<string, string> = {
  bar: "Raw observations summarized as group means, with optional SD, SEM or 95% t intervals. No automatic significance test.",
  violin:
    "Group distributions with individual observations. Density estimation requires at least three varying observations per group.",
  box: "Median, quartiles and whiskers by group; optional raw observations.",
  strip:
    "Individual observations with controlled horizontal jitter; preserves every measurement.",
  raincloud:
    "Half-density, median and quartiles, and raw observations. Density requires at least three varying measurements per group; outliers are retained.",
  raincloud_horizontal:
    "Horizontal half-density, box and raw observations. Adjust each layer separately. Jitter never changes measurement values.",
  grouped_raincloud:
    "Compare series within experimental-condition panels on a shared measurement scale. Each group–series combination needs at least three varying observations for density.",
  scatter:
    "Two continuous variables with optional group colors and a linear fit with 95% confidence band.",
  bubble:
    "Two continuous variables; bubble AREA encodes a third nonnegative quantity.",
  line: "Connect values in X order within groups. Supply one value per group and X position.",
  paired:
    "Connect repeated measurements by subject ID. One record per subject and condition.",
  grouped_bar:
    "Group means and optional uncertainty by two categorical factors. Supply raw independent observations.",
  stacked_bar:
    "Additive component summaries in common units; negative components are not allowed.",
  percent_bar:
    "Composition normalized within group. Every group must have a positive total.",
  histogram:
    "Frequency distribution of individual observations; choose the bin count.",
  density:
    "Kernel density of varying observations; bandwidth affects smoothing.",
  ecdf: "Empirical cumulative distribution of the observed values.",
  heatmap:
    "One value per matrix cell. Optional row z scores and similarity ordering; missing cells are not zero.",
  correlation:
    "Pearson or Spearman correlations computed from numeric feature columns. Constant columns are invalid.",
  volcano:
    "Display precomputed effect sizes and P values. Specify raw or adjusted P values; no differential-expression analysis is performed.",
  ma: "Display precomputed average expression and log fold changes. Log X requires strictly positive expression.",
  pca: "PCA on the selected numeric matrix, with optional standardization; scores and variance are recorded.",
  enrichment:
    "Precomputed enrichment ratio, count and P value. No enrichment analysis is performed.",
  lollipop: "Group means drawn as stems and points; supply raw observations.",
  forest:
    "Display supplied estimates and interval bounds, without recalculating intervals.",
  mean_interval:
    "Group mean with SD, SEM or a 95% t confidence interval. Raw observations may be overlaid.",
  dumbbell:
    "Two supplied measurements for each category, connected for comparison.",
  bland_altman:
    "Paired method difference against mean, with mean difference and limits of agreement.",
  qq: "Observed quantiles against theoretical normal quantiles; this is a diagnostic, not a normality test.",
  area: "Series drawn from a zero baseline; overlapping transparent areas are not additive totals.",
  ribbon:
    "Supplied estimates and lower/upper bounds. The app does not fit a model or infer the interval meaning.",
  roc: "Display supplied false-positive and true-positive curve coordinates; no model fitting.",
  precision_recall:
    "Display supplied precision and recall coordinates; no model fitting.",
  survival:
    "Display precomputed survival probabilities. Use Kaplan–Meier for individual event/censor data.",
  manhattan:
    "Precomputed locus association P values, grouped by chromosome. The threshold is illustrative until specified.",
  dot_matrix:
    "Supplied mean expression and expressing-cell fractions; bubble AREA encodes fraction. Not a raw single-cell analysis.",
  waterfall:
    "One relative change per category, sorted by value. This is not a cumulative balance chart.",
  clustered_heatmap:
    "Real row and column hierarchical clustering using Euclidean distances. Standardization changes the distances; linkage is recorded.",
  dendrogram:
    "Hierarchical clustering of numeric sample traits. This is not a sequence-based phylogenetic tree.",
  scatter_matrix:
    "Pairwise scatter plots of numeric features; axes retain original units.",
  parallel_coordinates:
    "Display multivariate profiles using min-max or z-score scaling. Source values are preserved.",
  pca_biplot:
    "PCA scores with scaled loading arrows. Arrow coordinates must not be interpreted as sample-score units.",
  kaplan_meier:
    "Independent right-censored observations: time and event 0/1. Kaplan–Meier estimates, log-log 95% CI and risk counts; no group test.",
  swimmer:
    "One follow-up interval per independent subject. Event and censor marks have different shapes.",
  gantt:
    "Supplied start/end intervals in common units. Overlapping tasks are allowed.",
  calendar_heatmap:
    "Daily observations with missing dates retained; absent observations are not zero.",
  polar_histogram:
    "Circular direction angles in degrees. Sector AREA represents count; this is not a linear histogram.",
  rank_abundance:
    "Integer taxon counts ranked independently within communities. Zero counts do not occupy ranks.",
  rarefaction:
    "Analytic expected richness for sampling without replacement from integer counts. No extrapolation or discarded counts.",
  genomic_intervals:
    "Supplied zero-based half-open genomic intervals. Confirm the coordinate system and assembly before importing.",
  alluvial:
    "Complete three-stage path counts; each row follows one cohort. Stage totals are conserved.",
  chord:
    "Undirected weighted relationships. Endpoint arc lengths are proportional to associated weight.",
  waffle:
    "Exclusive category proportions; largest-remainder rounding allocates cells. Legend retains actual proportions.",
  diverging_bar:
    "Signed supplied changes shown around zero, one record per category.",
  cumulative_waterfall:
    "Sequential signed changes; steps are changes and endpoints are totals. Row order is meaningful.",
  paired_difference:
    "Within-subject differences with mean difference and 95% t CI; pairs must be independent.",
  hexbin:
    "Hexagonal counts of two continuous variables; every valid observation contributes to a bin.",
  ridgeline: "Stacked density profiles by group; bandwidth controls smoothing.",
  beeswarm:
    "Individual observations positioned to reduce overlap while preserving measured values.",
  histogram_density: "Density-scaled histogram with a kernel-density overlay.",
  frequency_polygon: "Binned frequencies connected across bin centers.",
  dotplot: "Stacked individual-observation dots within value bins.",
  density2d:
    "Estimated two-dimensional density contours; smoothing does not create new observations.",
  bin2d: "Rectangular observation counts for pairs of continuous variables.",
  contour: "Contours from supplied values on a complete regular grid.",
  filled_contour: "Filled contour bands from a supplied complete regular grid.",
  stacked_area:
    "Additive components over time; common units and complete group-time combinations are required.",
  streamgraph:
    "Centered stacked components: thickness represents amount, vertical position is not a zero-baseline quantity.",
  slope: "Compare two supplied values for each category in the same units.",
  bump: "Precomputed ranks over time, not raw trait scores.",
  connected_scatter:
    "Connect two-dimensional observations in the supplied sequence order.",
  radar:
    "Nonnegative traits already on a common scale. No automatic normalization; polygon area is not an effect measure.",
  pie: "Mutually exclusive components of one total. For small differences, prefer a bar chart.",
  donut: "Category proportions with an adjustable center hole.",
  treemap:
    "Rectangle area represents a nonnegative component's share of the total.",
  mosaic:
    "Mutually exclusive contingency counts; no independence test is performed.",
  sankey: "Positive two-stage flows between source and target categories.",
  network:
    "Supplied undirected weighted edges in a circular layout; not inferred biological interactions.",
  funnel:
    "Supplied independent study effects and standard errors; no meta-analysis is performed.",
  calibration:
    "Precomputed probability-bin summaries; no model fitting or inferred intervals.",
  residual: "Supplied residuals and fitted values; the model is not refitted.",
  ternary:
    "Three nonnegative components in common units, normalized by row for display.",
  oncoprint:
    "Precomputed categorical states; absence must be explicitly encoded.",
  upset:
    "Exact set intersections from element membership, not pairwise overlap approximations.",
  scree: "Explained variance from PCA on the selected numeric features.",
  loading: "PCA loading coordinates for the selected numeric features.",
  lorenz:
    "Cumulative nonnegative value share against cumulative observation share.",
  grouped_stacked_bar:
    "One additive summary per group, series and component. Values must be nonnegative; repeated cells are rejected.",
  bar_line:
    "Supplied observed and reference values in the SAME units, sharing one numerical axis. No second axis or model fitting.",
  circular_bar:
    "One nonnegative summary per category. Sector AREA represents value, using square-root radii.",
  binary_heatmap:
    "Complete matrix of explicit 0 (absent) and 1 (present). Missing observations cannot stand for absence.",
  correlation_bubble:
    "Pearson or Spearman correlation; bubble AREA encodes absolute correlation, color encodes sign.",
  circular_heatmap:
    "A complete matrix arranged in rings, with optional row z scores. No clustering is performed.",
};
for (const id of [
  "bar_plain",
  "bar_error",
  "bar_horizontal",
  "bar_horizontal_points",
  "bar_outline",
  "bar_sorted",
  "bar_labels",
  "grouped_bar_plain",
  "grouped_bar_points",
  "grouped_bar_horizontal",
])
  englishDescriptions[id] = englishDescriptions.bar;
englishDescriptions.grouped_box = englishDescriptions.box;
englishDescriptions.grouped_violin = englishDescriptions.violin;
