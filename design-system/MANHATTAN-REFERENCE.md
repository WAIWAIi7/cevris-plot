# Manhattan example review

Reviewed 2026-11-04. The former example had only 450 randomly scattered points and assigned strong signals to unrelated positions. It did not demonstrate a typical dense GWAS background with local association clusters.

References consulted:
- [qqman author vignette](https://github.com/stephenturner/qqman/blob/master/vignettes/qqman.Rmd): alternating chromosome colours, genomic position, -log10(P), controllable point size. Its included data are also simulated.
- [Cambridge GWAS training](https://cambiotraining.github.io/gwas/archive/2025.03.17/materials/08-manhattan.html): visual inspection of a GWAS result figure and explanation of clustered association signals. This implementation retains all submitted points rather than adopting the example's P-value display filter.
- [JBrowse GWAS documentation](https://jbrowse.org/jb2/docs/user_guides/gwas_track/): each plotted point represents a variant and its association P value.

Our replacement is explicitly synthetic: 24,000 unique variants, 12 unequal simulated chromosomes, seed 1729, nonuniform position spacing, uniform null P values and several noisy local signal clusters. Coordinates are not an identified reference assembly; these are neither real rice loci nor inference results. The illustrative 5e-8 threshold remains editable.

Default appearance: 220 × 110 mm, 0.6 point size in ggplot units, alternating Steel Blue/Sage, Times New Roman, 0.5 line width in ggplot units. All imported rows remain unmodified. Saved projects retain their original data and parameters; reopen template 098 to use the new example.

The denser example exposed slow standalone R source loading with a multi-megabyte, heavily indented JSON literal. The shared R exporter now uses compact JSON for large projects and bounded string assignments, then joins the original data without changing values. JSON Unicode escapes keep embedded Chinese and emoji valid under Windows source locales. The regression test executes all 24,000 points independently of the server and checks the output point count.
