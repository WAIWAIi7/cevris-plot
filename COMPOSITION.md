# 推荐主页、组图与 R 源码

## 选择主页推荐

主页的“选择推荐图表”展示全部 105 个具体模板的真实 R 预览。点击图片放大；点击“选择”加入主页。每个模板拥有固定三位编号，柱状图为 001–020，完整映射见 [图表编号](CHART_NUMBERS.md)。编号不会因筛选或收藏改变。

最多选择 24 张；上方编号旁的左右按钮调整顺序。“保存选择”保存在当前浏览器。所有者已选定开源版默认顺序：011、035、054、058、071、073、077、102；名单保存在 `shared/home.mjs` 的 `HOME_RECIPES`。已有非空本地选择优先；旧版本的空白占位自动使用新默认名单。新版本明确保存的空名单仍会保留。

## 组图

1. 在编辑页调整第一张图，点击“加入组图”。也可以在组图页添加当前图形、已保存项目，或导入一个/多个 `.figure.json`。
2. 每张子图是独立数据和参数的快照。点击编辑按钮进入工作台，修改后点击“更新组图子图”。
3. 选中参考子图，点击“应用到同图型子图”，将它的外观参数复制给 **相同具体模板（recipeId）** 的其他子图。保留各自数据、字段映射、标签和分组顺序。颜色按相同组名匹配。不同图型不强行覆盖。
4. 默认不复制统计定义、标准化方法或坐标范围。需要全部统一时，勾选“同时同步统计设置与坐标范围”。复制设置后仍会校验每张图的数据。
5. 调节列数、整页宽高、间距、外侧留白、背景和 A–L 标签，可移动子图顺序。预览调用原 R 图形对象重新排版；缩放只改变网页查看比例。
6. 导出 SVG、PDF、PNG、TIFF、独立 R 源码，或 `.composition.json`。组图文件包含每张图的完整数据和设置，可重新打开继续编辑。

浏览器为组图保存独立草稿，不覆盖单图草稿。组图页面的撤销/重做保留最近 20 次修改；离开页面后撤销栈重置，草稿本身保留。下载 `.composition.json` 适合备份和迁移。

当前支持最多 12 张子图、1–4 列规则网格、100–600 mm 宽和 80–600 mm 高。扣除留白和标签后每张子图至少 35 mm；栅格导出最多 6000 万像素。绘图区宽度可在布局结构兼容时对齐；长标签、不同图例和固定纵横比仍可能产生不同留白，需检查最终布局。这版不是自由拖拽任意位置的拼版画布，也不自动合并图例或统计。

## 所有图导出 R

单图导出面板的“下载原始 R 源码”适用于全部 105 个模板；组图页同样有“下载 R 源码”。得到一个 `.R` 文件，包含数据、参数以及实际使用的完整 R 绘图实现，不是截图、网页地址或调用本地服务器的脚本。

运行需要 R ≥ 4.1，以及 ggplot2、jsonlite、svglite、systemfonts、ragg、MASS、survival、hexbin 和所选字体。依赖齐全后可离线运行，无需 Cevris Plot 服务。脚本不会自动安装包。使用已安装的工作台 R 时沿用其 `.runtime/library` 包目录。

在 RStudio 中 Source，或运行 `Rscript figure.R`。输出写入当前工作目录；顶部 `output_file` 和 `output_format` 控制文件名与 SVG/PDF/PNG/TIFF 格式。嵌入的 JSON 保存所有数据和参数，下方是可修改的 R 函数。脚本包含完整引擎，因此比手写单张 ggplot 脚本长；这是完整复现导出，不是精简代码生成器。

智能体也可导出：

```text
node scripts/figure.mjs export-r --project result.figure.json --out figure.R
node scripts/figure.mjs export-r --project result.composition.json --out composition.R
```

R 源码改变不会反向同步网页。若要在网页继续编辑，请同时保存项目 JSON。Prism 导出入口、API 和命令已移除，旧 `.figure.json` 仍可在 R 工作台继续使用。

## English quick reference

Home recommendations are owner-selected. Each template has a stable number and real preview; bar variants occupy 001–020. Save up to 24 locally, in your chosen order.

Use **Add to composition**, add saved figures or import `.figure.json` files. Settings sync targets the exact same recipe only; data, mappings and labels stay independent. Statistics and axis ranges are opt-in. Arrange up to 12 panels in a 1–4 column grid, with dimensions, gaps, margins, labels and zoom controls. Export images, standalone R or an editable `.composition.json`. Composition undo history is local to the open page.

All 105 recipes and compositions export actual R source with embedded data and settings. The script requires R ≥ 4.1, the listed packages and the requested fonts; it runs without the web server. Download editable JSON separately if you want to continue with visual controls. Prism export is no longer available.
