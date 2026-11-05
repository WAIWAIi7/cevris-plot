// Display-only synthetic GWAS results, not a statistical model or real loci.
// Uses the caller's seeded RNG; imported measurements never pass through here.
export function manhattanExample(rand) {
  const lengths = [
    43.2, 35.9, 36.4, 35.1, 29.7, 31.4, 29.5, 28.4, 23.1, 23.4, 28.9, 27.2,
  ];
  const total = lengths.reduce((a, b) => a + b, 0);
  // [chromosome, fractional position, peak height, decay span in bp].
  const peaks = [
    [1, 0.64, 5.3, 420000],
    [3, 0.37, 16.5, 530000],
    [5, 0.73, 9.2, 360000],
    [7, 0.58, 12.4, 480000],
    [10, 0.29, 8.6, 350000],
    [11, 0.78, 5.8, 300000],
  ];
  const rows = [];
  lengths.forEach((length, c) => {
    const span = Math.round(length * 1e6);
    const count =
      c === lengths.length - 1
        ? 24000 - rows.length
        : Math.round((24000 * length) / total);
    const positions = new Set();
    while (positions.size < count) positions.add(1 + Math.floor(rand() * span));
    for (const position of [...positions].sort((a, b) => a - b)) {
      // Uniform null P values produce a dense background near zero on -log10(P).
      let score = -Math.log10(Math.max(rand(), 1e-12));
      for (const [chr, fraction, height, decay] of peaks) {
        if (chr !== c + 1) continue;
        const distance = Math.abs(position - span * fraction);
        if (distance < decay * 5 && rand() < 0.85)
          score +=
            height *
            Math.exp(-distance / decay) *
            (0.28 + 0.72 * rand() ** 0.35);
      }
      rows.push({
        Variant: `SNP_${c + 1}_${position}`,
        Chromosome: String(c + 1),
        Position: position,
        P: Number((10 ** -score).toPrecision(8)),
      });
    }
  });
  return rows;
}
