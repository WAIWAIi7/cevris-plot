export const PRODUCT = Object.freeze({
  name: "Cevris Plot",
  slug: "cevris-plot",
  version: "0.8.0",
});
export const isCompatibleApp = (id) => [PRODUCT.slug, "figure-studio"].includes(id);
