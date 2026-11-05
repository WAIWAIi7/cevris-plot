// Deterministic categorical extensions. Preserve the authored swatches first;
// then select separated variants in their hue families. This is not a claim
// that an arbitrarily large number of categories is perceptually distinguishable.
const cache = new Map();
const rgb = (hex) =>
  hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255);
function hue(hex) {
  const [r, g, b] = rgb(hex),
    hi = Math.max(r, g, b),
    lo = Math.min(r, g, b),
    d = hi - lo;
  if (!d) return 0;
  return (
    ((hi === r ? (g - b) / d : hi === g ? (b - r) / d + 2 : (r - g) / d + 4) *
      60 +
      360) %
    360
  );
}
function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((v) =>
        Math.round(255 * v)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}
// Weighted luminance/chroma coordinates used only to rank candidate separation.
function vector(hex) {
  const [r, g, b] = rgb(hex);
  return [
    0.299 * r + 0.587 * g + 0.114 * b,
    0.596 * r - 0.274 * g - 0.322 * b,
    0.211 * r - 0.523 * g + 0.312 * b,
  ];
}
const distance = (a, b) =>
  2 * (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
export function categoricalColors(base, count) {
  const key = base.join(","),
    needed = Math.max(base.length, count);
  let entry = cache.get(key);
  if (!entry) {
    const colors = [...new Set(base.map((c) => c.toUpperCase()))],
      used = new Set(colors),
      candidates = [];
    for (const c of base)
      for (const offset of [0, -12, 12])
        for (const s of [0.28, 0.4, 0.52])
          for (const l of [0.34, 0.46, 0.58, 0.7]) {
            const value = hsl((hue(c) + offset + 360) % 360, s, l);
            if (!used.has(value)) {
              used.add(value);
              candidates.push({
                value,
                vector: vector(value),
                score: Infinity,
              });
            }
          }
    for (const c of colors)
      for (const item of candidates)
        item.score = Math.min(item.score, distance(vector(c), item.vector));
    entry = { colors, candidates, used, fallback: 0 };
    cache.set(key, entry);
  }
  while (entry.colors.length < needed) {
    if (entry.candidates.length) {
      let best = 0;
      for (let i = 1; i < entry.candidates.length; i++)
        if (entry.candidates[i].score > entry.candidates[best].score) best = i;
      const [chosen] = entry.candidates.splice(best, 1);
      entry.colors.push(chosen.value);
      for (const item of entry.candidates)
        item.score = Math.min(item.score, distance(chosen.vector, item.vector));
    } else {
      // Historical group names can reserve swatches beyond the visible groups.
      const n = entry.fallback++,
        color = hsl(
          (n * 137.507764 + 23) % 360,
          0.35 + (n % 7) * 0.06,
          0.3 + (n % 11) * 0.038,
        );
      if (!entry.used.has(color)) {
        entry.used.add(color);
        entry.colors.push(color);
      }
    }
  }
  return entry.colors.slice(0, count);
}
