import { raincloudExample, configureRaincloud } from "./raincloud.mjs";
import { variantExample, configureVariant } from "./recipes-v6.mjs";
import { englishDemo } from "./demo-english.mjs";
import { defaults, PALETTE, recipeById } from "./catalog.mjs";
import { expansionExample } from "./extensions.mjs";
import { packExample, PACK } from "./recipes-v3.mjs";
import { researchExample, configureResearchExample } from "./recipes-v4.mjs";
function rng(seed = 1729) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function exampleData(kind) {
  const rand = rng(),
    normal = () =>
      Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-9))) *
      Math.cos(2 * Math.PI * rand());
  const groups = ["对照组", "低盐组", "高盐组", "恢复组"];
  let rows = [],
    mapping = {},
    context = "",
    title = "";
  if (kind === "phenotype" || kind === "relationship") {
    rows = groups.flatMap((g, j) =>
      Array.from({ length: 12 }, (_, i) => {
        const root = Math.max(
          15,
          [63, 51, 36, 55][j] + normal() * [6, 7, 5, 8][j],
        );
        return {
          样本: "植株" + (j * 12 + i + 1),
          处理组: g,
          根长: +root.toFixed(2),
          株高: +(root * 0.47 + normal() * 3 + 8).toFixed(2),
          生物量: +(root * 0.07 + rand() * 0.7).toFixed(3),
        };
      }),
    );
    mapping = {
      group: "处理组",
      value: "根长",
      x: "株高",
      y: "根长",
      size: "生物量",
    };
    context = "模拟水稻盐处理实验，每组12株独立植株；根长和株高单位为毫米。";
    title = kind === "relationship" ? "株高与根长的关系" : "不同处理的根长分布";
  } else if (kind === "factorial") {
    rows = ["品种一", "品种二"].flatMap((s, k) =>
      groups.slice(0, 3).flatMap((g, j) =>
        Array.from({ length: 8 }, (_, i) => ({
          样本: [k, j, i].join("-"),
          处理组: g,
          品种: s,
          根长: +([61, 49, 34][j] + k * 7 + normal() * 5).toFixed(2),
        })),
      ),
    );
    mapping = { group: "处理组", value: "根长", series: "品种" };
    context = "模拟两个品种的三种处理，每组合8株独立植株。";
    title = "不同品种的根长响应";
  } else if (kind === "time") {
    rows = groups.slice(0, 3).flatMap((g, j) =>
      [0, 2, 5, 9, 14].map((t) => ({
        处理组: g,
        时间: t,
        根长: +(18 + t * [3.2, 2.6, 1.7][j] + normal() * 1.8).toFixed(2),
      })),
    );
    mapping = { group: "处理组", x: "时间", y: "根长" };
    context = "模拟各组随时间的变化，每组每个时间点一条记录。";
    title = "根长随时间的变化";
  } else if (kind === "paired") {
    rows = Array.from({ length: 14 }, (_, i) => {
      const before = 40 + normal() * 6;
      return ["处理前", "处理后"].map((g, j) => ({
        个体: "植株" + (i + 1),
        阶段: g,
        根长: +(before + j * (7 + normal() * 4)).toFixed(2),
      }));
    }).flat();
    mapping = { group: "阶段", value: "根长", subject: "个体" };
    context = "模拟14株幼苗处理前后重复测量，个体编号用于配对。";
    title = "同一植株处理前后的变化";
  } else if (kind === "composition") {
    rows = groups.flatMap((g, j) =>
      ["根", "茎", "叶"].map((s, k) => ({
        处理组: g,
        器官: s,
        干重: +(3 + rand() * 4 + j * 0.2 + k).toFixed(2),
      })),
    );
    mapping = { group: "处理组", series: "器官", value: "干重" };
    context = "模拟各处理的器官干重组成，单位为克，输入已经汇总。";
    title = "各处理的生物量组成";
  } else if (kind === "matrix") {
    rows = Array.from({ length: 16 }, (_, i) =>
      Array.from({ length: 8 }, (_, j) => ({
        基因: "基因" + String(i + 1).padStart(2, "0"),
        样本: "样本" + (j + 1),
        表达量: +(
          8 +
          Math.sin(i * 0.5) * (j < 4 ? 2 : -2) +
          normal() * 0.6
        ).toFixed(3),
      })),
    ).flat();
    mapping = { row: "基因", column: "样本", value: "表达量" };
    context = "模拟16个基因、8个样本的对数表达矩阵。";
    title = "基因表达概览";
  } else if (kind === "multivariate") {
    rows = Array.from({ length: 24 }, (_, i) => {
      const g = i < 12 ? 0 : 1,
        z = normal();
      return {
        样本: "样本" + (i + 1),
        处理组: g ? "处理组" : "对照组",
        ...Object.fromEntries(
          ["根长", "株高", "鲜重", "叶绿素", "根表面积"].map((n, k) => [
            n,
            +(
              20 +
              k * 5 +
              z * (2 + k * 0.4) +
              g * [7, 4, -2, 5, 3][k] +
              normal() * 2
            ).toFixed(3),
          ]),
        ),
      };
    });
    mapping = {
      group: "处理组",
      columns: ["根长", "株高", "鲜重", "叶绿素", "根表面积"],
    };
    context = "模拟24个独立样本的5项相关性状。";
    title = "多变量性状概览";
  } else if (kind === "omics") {
    rows = Array.from({ length: 480 }, (_, i) => {
      const effect = normal() * (i % 5 === 0 ? 1.8 : 0.48),
        p = Math.min(0.999, Math.exp(-(Math.abs(effect) * 2.7 + rand() * 3)));
      return {
        基因: "基因" + String(i + 1).padStart(4, "0"),
        对数倍数变化: +effect.toFixed(4),
        校正显著性: +p.toPrecision(5),
        平均表达量: +Math.exp(2 + rand() * 6).toFixed(2),
      };
    });
    mapping = {
      effect: "对数倍数变化",
      p: "校正显著性",
      label: "基因",
      x: "平均表达量",
    };
    context = "模拟已有差异分析结果；显著性列作为已有校正结果展示。";
    title = "盐处理的基因表达变化";
  } else if (kind === "enrichment") {
    rows = [
      "氧化应激响应",
      "离子转运",
      "根系发育",
      "激素信号",
      "细胞壁组织",
      "碳代谢",
      "渗透调节",
      "光合作用",
    ].map((t) => ({
      通路: t,
      富集比例: +(0.08 + rand() * 0.3).toFixed(3),
      命中数: Math.round(8 + rand() * 45),
      校正显著性: +Math.exp(-3 - rand() * 5).toPrecision(4),
    }));
    mapping = {
      term: "通路",
      ratio: "富集比例",
      count: "命中数",
      p: "校正显著性",
    };
    context = "模拟已有富集分析结果。";
    title = "功能富集结果";
  } else if (kind === "interval") {
    rows = ["根长", "株高", "鲜重", "叶绿素", "根表面积"].map((t) => {
      const e = normal() * 0.5,
        w = 0.2 + rand() * 0.4;
      return {
        指标: t,
        估计值: +e.toFixed(3),
        下限: +(e - w).toFixed(3),
        上限: +(e + w).toFixed(3),
      };
    });
    mapping = {
      term: "指标",
      estimate: "估计值",
      lower: "下限",
      upper: "上限",
    };
    context = "模拟已有的效应估计及95%区间，不重新计算区间。";
    title = "各性状的效应估计";
  } else {
    ({ rows, mapping, title, context } =
      raincloudExample(kind, rand, normal) ||
      variantExample(kind, rand) ||
      researchExample(kind, rand, normal) ||
      packExample(kind, rand, normal) ||
      expansionExample(kind, rand, normal));
  }
  return {
    name: "模拟数据",
    columns: Object.keys(rows[0]),
    rows,
    synthetic: true,
    seed: 1729,
    mapping,
    context,
    title,
  };
}
export function exampleProject(recipeId = "violin") {
  const recipe = recipeById(recipeId);
  if (!recipe) throw new Error("未知图表");
  const data = exampleData(recipe.example),
    params = defaults();
  if (PACK.some((r) => r.id === recipeId)) {
    params.legend = recipe.roles.some((r) => ["group", "series"].includes(r.id))
      ? "right"
      : "none";
    if (recipeId === "slope") data.rows = data.rows.slice(0, 7);
    if (["radar", "ternary", "network", "pie", "donut"].includes(recipeId)) {
      params.widthMm = 160;
      params.heightMm = 140;
    }
    if (recipeId === "oncoprint") params.axisAngle = "90";
    if (
      recipeId === "bin2d" ||
      recipeId === "filled_contour" ||
      recipeId === "contour"
    ) {
      params.legend = "right";
      params.colorLow = "#DCE8F1";
      params.colorHigh = "#3F6B4F";
    }
    if (recipeId === "histogram_density") params.alpha = 0.45;
    if (recipeId === "upset") {
      params.widthMm = 190;
      params.heightMm = 130;
    }
  }
  if (recipeId === "mean_interval") params.errorType = "ci";
  if (recipeId === "heatmap") params.axisAngle = "45";
  if (recipeId === "dumbbell") data.rows = data.rows.slice(0, 8);
  if (recipeId === "waterfall") {
    params.axisAngle = "90";
    params.widthMm = 180;
    params.heightMm = 120;
  }
  if (recipeId === "manhattan") {
    params.pointSize = 0.6;
    params.widthMm = 220;
    params.heightMm = 110;
    params.colorLow = "#5B7EA6";
    params.colorHigh = "#8BA77E";
  }
  if (
    [
      "area",
      "ribbon",
      "roc",
      "precision_recall",
      "survival",
      "qq",
      "dot_matrix",
      "waterfall",
      "dumbbell",
    ].includes(recipeId)
  )
    params.legend = "right";
  if (recipeId === "area") params.alpha = 0.3;
  if (recipeId === "dot_matrix") {
    params.colorLow = "#DCE8F1";
    params.colorHigh = "#3F6B4F";
    params.pointSize = 2;
  }
  if (recipeId === "ribbon") data.title = "根长估计与给定区间";
  if (
    [
      "grouped_bar",
      "stacked_bar",
      "percent_bar",
      "line",
      "density",
      "ecdf",
      "scatter",
      "pca",
      "volcano",
      "enrichment",
      "heatmap",
      "correlation",
    ].includes(recipeId)
  )
    params.legend = "right";
  configureResearchExample(recipeId, data, params);
  configureVariant(recipeId, data, params);
  configureRaincloud(recipeId, data, params);
  return englishDemo({
    schemaVersion: 1,
    id: null,
    revision: 0,
    name: data.title,
    recipeId,
    context: data.context,
    data,
    originalData: structuredClone(data),
    mapping: Object.fromEntries(
      recipe.roles
        .filter((r) => data.mapping[r.id])
        .map((r) => [r.id, data.mapping[r.id]]),
    ),
    labels: {
      title: "",
      x: "",
      y: "",
      note: recipeId === "ribbon" ? "模拟的已有区间；请用实际分析定义替换" : "",
    },
    params,
    colors: Object.fromEntries(
      ["对照组", "低盐组", "高盐组", "恢复组"].map((g, i) => [g, PALETTE[i]]),
    ),
    groupOrder:
      recipe.example === "paired"
        ? ["处理前", "处理后"]
        : ["对照组", "低盐组", "高盐组", "恢复组"],
    transforms: [],
    history: [],
  });
}
