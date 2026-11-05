# Cevris Plot template catalog

105 R-backed templates, including visual variants. All provide English seeded synthetic examples. UI language does not alter data.

## 柱状图 / Bar charts

| ID | 模板 | Input roles |
| --- | --- | --- |
| `bar` | 柱状图与散点 | group (category), value (number) |
| `bar_plain` | 基础柱状图 | group (category), value (number) |
| `bar_error` | 误差柱状图 | group (category), value (number) |
| `bar_horizontal` | 横向柱状图 | group (category), value (number) |
| `bar_horizontal_points` | 横向散点柱状图 | group (category), value (number) |
| `bar_outline` | 空心柱状图 | group (category), value (number) |
| `bar_sorted` | 排序柱状图 | group (category), value (number) |
| `bar_labels` | 数值标注柱状图 | group (category), value (number) |
| `grouped_bar` | 分组柱状图 | group (category), value (number), series (category) |
| `grouped_bar_plain` | 分组基础柱状图 | group (category), value (number), series (category) |
| `grouped_bar_points` | 分组散点柱状图 | group (category), value (number), series (category) |
| `grouped_bar_horizontal` | 横向分组柱状图 | group (category), value (number), series (category) |
| `stacked_bar` | 堆叠柱状图 | group (category), value (number), series (category) |
| `percent_bar` | 百分比堆叠图 | group (category), value (number), series (category) |
| `grouped_stacked_bar` | 分组堆叠柱状图 | group (category), value (number), series (category), component (category) |
| `bar_line` | 柱状与折线组合图 | group (category), value (number), reference (number) |
| `diverging_bar` | 水平发散条形图 | term (category), value (number) |
| `waterfall` | 排序瀑布图 | term (category), value (number) |
| `cumulative_waterfall` | 累计变化瀑布图 | term (category), value (number) |
| `circular_bar` | 环形柱状图 | group (category), value (number) |

## 散点图 / Scatter plots

| ID | 模板 | Input roles |
| --- | --- | --- |
| `scatter` | 散点图 | x (number), y (number), group (category, optional) |
| `strip` | 分组散点图 | group (category), value (number) |
| `beeswarm` | 蜂群散点图 | group (category), value (number) |
| `scatter_matrix` | 散点矩阵 | columns (multi), group (category, optional) |
| `connected_scatter` | 连线散点图 | x (number), y (number), group (category, optional), sequence (number) |
| `pca` | 主成分得分图 | columns (multi), group (category, optional) |
| `pca_biplot` | 主成分双标图 | columns (multi), group (category, optional) |
| `loading` | 主成分载荷图 | columns (multi) |
| `bland_altman` | Bland–Altman 一致性图 | subject (category), first (number), second (number) |
| `residual` | 残差诊断图 | x (number), y (number), group (category, optional) |
| `qq` | 正态 Q–Q 图 | value (number), group (category, optional) |

## 折线与面积图 / Lines & areas

| ID | 模板 | Input roles |
| --- | --- | --- |
| `line` | 折线图 | x (number), y (number), group (category) |
| `paired` | 配对轨迹图 | group (category), value (number), subject (category) |
| `area` | 面积图 | x (number), y (number), group (category, optional) |
| `ribbon` | 区间带折线图 | x (number), y (number), group (category, optional), lower (number), upper (number) |
| `stacked_area` | 堆叠面积图 | x (number), y (number), group (category, optional) |
| `streamgraph` | 河流图 | x (number), y (number), group (category, optional) |
| `slope` | 斜率图 | term (category), first (number), second (number) |
| `bump` | 排名变化图 | x (number), y (number), group (category, optional) |
| `ecdf` | 累积分布图 | value (number), group (category, optional) |
| `roc` | ROC 曲线 | x (number), y (number), group (category, optional) |
| `precision_recall` | PR 曲线 | x (number), y (number), group (category, optional) |
| `survival` | 生存曲线（已有估计） | x (number), y (number), group (category, optional) |
| `kaplan_meier` | Kaplan–Meier 生存分析图 | subject (category), time (number), event (number), group (category, optional) |
| `calibration` | 校准曲线 | x (number), y (number), group (category, optional) |
| `lorenz` | 洛伦兹曲线 | value (number), group (category, optional) |
| `scree` | 主成分碎石图 | columns (multi) |
| `rarefaction` | 个体稀释曲线 | group (category), taxon (category), count (number) |
| `rank_abundance` | 物种等级丰度图 | group (category), taxon (category), count (number) |

## 箱线与小提琴图 / Box & violin plots

| ID | 模板 | Input roles |
| --- | --- | --- |
| `box` | 箱线图 | group (category), value (number) |
| `grouped_box` | 分组箱线图 | group (category), value (number), series (category) |
| `violin` | 小提琴图 | group (category), value (number) |
| `grouped_violin` | 分组小提琴图 | group (category), value (number), series (category) |

## 云雨图 / Raincloud plots

| ID | 模板 | Input roles |
| --- | --- | --- |
| `raincloud` | 云雨图（竖向） | group (category), value (number) |
| `raincloud_horizontal` | 云雨图（横向） | group (category), value (number) |
| `grouped_raincloud` | 分组云雨图 | group (category), value (number), series (category) |

## 直方与密度图 / Distributions

| ID | 模板 | Input roles |
| --- | --- | --- |
| `histogram` | 直方图 | value (number), group (category, optional) |
| `density` | 密度图 | value (number), group (category, optional) |
| `ridgeline` | 山脊密度图 | group (category), value (number) |
| `histogram_density` | 直方与密度叠加图 | value (number) |
| `frequency_polygon` | 频数折线图 | group (category), value (number) |
| `dotplot` | 堆叠点图 | value (number) |
| `density2d` | 二维密度等高线 | x (number), y (number), group (category, optional) |
| `bin2d` | 二维分箱热图 | x (number), y (number) |
| `hexbin` | 六边形分箱图 | x (number), y (number) |
| `contour` | 数值等高线图 | x (number), y (number), value (number) |
| `filled_contour` | 填色等高线图 | x (number), y (number), value (number) |
| `polar_histogram` | 方向分布玫瑰图 | angle (number) |

## 热图 / Heatmaps

| ID | 模板 | Input roles |
| --- | --- | --- |
| `heatmap` | 热图 | row (category), column (category), value (number) |
| `clustered_heatmap` | 树状聚类热图 | row (category), column (category), value (number) |
| `circular_heatmap` | 环形热图 | row (category), column (category), value (number) |
| `correlation` | 相关矩阵 | columns (multi) |
| `correlation_bubble` | 相关性气泡矩阵 | columns (multi) |
| `binary_heatmap` | 二值热图 | row (category), column (category), value (number) |
| `calendar_heatmap` | 日历热图 | date (category), value (number) |
| `oncoprint` | 分类变异矩阵 | row (category), column (category), group (category) |

## 气泡图 / Bubble plots

| ID | 模板 | Input roles |
| --- | --- | --- |
| `bubble` | 气泡图 | x (number), y (number), size (number), group (category, optional) |
| `dot_matrix` | 点阵表达图 | row (category), column (category), value (number), size (number) |
| `enrichment` | 富集气泡图 | term (category), ratio (number), count (number), p (number) |

## 棒棒糖与区间图 / Lollipop & intervals

| ID | 模板 | Input roles |
| --- | --- | --- |
| `lollipop` | 棒棒糖图 | group (category), value (number) |
| `mean_interval` | 均值区间图 | group (category), value (number) |
| `dumbbell` | 哑铃图 | term (category), first (number), second (number) |
| `forest` | 区间图 | term (category), estimate (number), lower (number), upper (number) |
| `paired_difference` | 配对差值估计图 | subject (category), first (number), second (number) |
| `funnel` | 漏斗图 | estimate (number), se (number) |

## 饼图与组成图 / Composition

| ID | 模板 | Input roles |
| --- | --- | --- |
| `pie` | 饼图 | group (category), value (number) |
| `donut` | 环形图 | group (category), value (number) |
| `waffle` | 华夫饼比例图 | group (category), value (number) |
| `treemap` | 矩形树图 | group (category), value (number) |
| `mosaic` | 马赛克列联图 | group (category), series (category), value (number) |
| `ternary` | 三元组成图 | a (number), b (number), c (number), group (category, optional) |

## 网络与流向图 / Networks & flows

| ID | 模板 | Input roles |
| --- | --- | --- |
| `network` | 环形网络图 | source (category), target (category), value (number) |
| `sankey` | 双阶段桑基图 | source (category), target (category), value (number) |
| `alluvial` | 三阶段流向图 | stage1 (category), stage2 (category), stage3 (category), value (number) |
| `chord` | 加权弦图 | source (category), target (category), value (number) |

## 组学图 / Omics

| ID | 模板 | Input roles |
| --- | --- | --- |
| `volcano` | 火山图 | effect (number), p (number), label (category, optional) |
| `ma` | 均值差异图 | x (number), effect (number) |
| `manhattan` | 曼哈顿图 | chromosome (category), position (number), p (number) |
| `genomic_intervals` | 基因组区间轨道图 | chromosome (category), start (number), end (number), label (category), group (category, optional) |

## 树状图 / Trees

| ID | 模板 | Input roles |
| --- | --- | --- |
| `dendrogram` | 层次聚类树 | subject (category), columns (multi) |

## 集合交集图 / Set intersections

| ID | 模板 | Input roles |
| --- | --- | --- |
| `upset` | 集合交集图 | element (category), set (category) |

## 雷达与多维图 / Radar & multivariate

| ID | 模板 | Input roles |
| --- | --- | --- |
| `radar` | 雷达图 | term (category), value (number), group (category) |
| `parallel_coordinates` | 平行坐标图 | subject (category), columns (multi), group (category, optional) |

## 时间区间图 / Timelines

| ID | 模板 | Input roles |
| --- | --- | --- |
| `gantt` | 实验时间甘特图 | term (category), start (number), end (number), group (category, optional) |
| `swimmer` | 个体随访泳道图 | subject (category), time (number), event (number), group (category, optional) |
