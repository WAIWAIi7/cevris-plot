---
name: cevris-plot
description: 根据实验背景选择科研图表、检查数据并使用 R 直接生成图片和可在中英文本地网页中继续编辑的项目。适用于实验测量、矩阵和已有组学分析结果，支持用户指定图形与零代码网页交接。
---

# Cevris Plot

本目录是独立的 R 绘图工作台与 Skill。以 R 为主；只有确认 R 方案不适用时才考虑其他引擎。当前105个图表配方全部使用 R / ggplot2，不依赖 Prism。完整输入说明见 [CATALOG.md](CATALOG.md)；优先按需求读取 catalog 命令中的对应配方。

## 使用入口

所有命令从此目录运行。Windows 优先使用 .runtime/node/node.exe，也可使用已安装的 node。智能体首次缺少环境时执行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1`，无需打开屏幕；手动使用者双击 first-install.cmd 自动安装并打开网页，以后用 start.cmd。首次安装联网下载官方运行库，安装后绘图、编辑和导出只访问本机。

    node scripts/figure.mjs doctor
    node scripts/figure.mjs catalog
    node scripts/figure.mjs palettes
    node scripts/figure.mjs inspect --input "/path/data.xlsx" --sheet "Sheet1"
    node scripts/figure.mjs example --recipe violin --out example.csv
    node scripts/figure.mjs create --spec specification.json --out result.figure.json
    node scripts/figure.mjs validate --project result.figure.json
    node scripts/figure.mjs render --project result.figure.json --format svg --out result.svg
    node scripts/figure.mjs open --project result.figure.json

doctor 检查实际 R、字体与设备。catalog 提供现有配方、列含义和参数；只承诺实际实现的配方。inspect 检查列类型、缺失值和样例，其中选图建议是离线规则，不是模型分析。

specification.json 示例（input 相对此文件）：

    {
      "input": "roots.csv",
      "recipeId": "violin",
      "name": "水稻苗期根长",
      "context": "每组12株独立植株，比较盐处理后的根长",
      "mapping": {"group": "处理", "value": "根长"},
      "params": {"linewidth": 0.5, "showPoints": true},
      "labels": {"title": "不同处理下的根长", "y": "根长（毫米）"}
    }

创建、验证并渲染后，使用 open 将项目作为新副本交到本地工作台并打开浏览器；加 --browser false 可只返回直达编辑页的网址。用户不需要再次导入数据。也可从“我的项目 → 打开本地项目文件”手动交接。项目包含原始数据、变换记录、参数与配色；不是单张截图或 R 源码。

## 两种交付方式

配色可在 spec 中设置 `"palette": "ocean-coral"`；先通过 palettes 查询可用名称，分类、连续、发散色阶不能混用。分类配色支持到100个实际类别，超过基础色数时自动扩展；类别很多时优先考虑标签、分面，不把“色号不同”等同于容易区分。已有同名类别颜色保持稳定，改名按新类别处理。显式 colors/颜色参数覆盖预设。完整说明见 [PALETTES.md](PALETTES.md)。

用户要求 R 源码时，执行 `node scripts/figure.mjs export-r --project result.figure.json --out figure.R`。全部105种配方支持；组图的 `.composition.json` 也可导出独立 R。脚本嵌入数据、参数和完整实际绘图实现，依赖本机 R、指定 R 包和字体，不需要网页服务。不要声称只包含几行精简 ggplot 代码。另交付项目 JSON 以供网页继续编辑。

用户需要组图时，阅读 [COMPOSITION.md](COMPOSITION.md)。网页可添加当前图形、已保存图形或多个 `.figure.json`，以选中子图为参考同步同一具体模板的外观。统计设置与坐标范围需明确选择；保留各图数据、字段映射、标签和分组顺序。不要为“统一外观”改动原始测量或统计定义。推荐主页由用户选择，固定编号见 [CHART_NUMBERS.md](CHART_NUMBERS.md)，不要未经指示修改默认名单。Prism 导出已移除。

用户要求图片时，准备好结构化 spec 后执行：

    node scripts/figure.mjs draw --spec specification.json --out result.png

draw 实际运行 R，返回图片、元数据和 result.figure.json 路径。向用户交付图片和可编辑文件，不要求用户打开网页完成绘图。用户需要细调时，再执行 open，返回已载入数据的编辑页；不覆盖旧项目。屏幕忙时用 --browser false，只返回链接。

用户不使用智能体时，运行 start.cmd，图表库提供英文示例、CSV下载、上传与字段映射，之后用可视化控件编辑和导出。网页不需要 AI Token。

此 Skill 要求宿主能读取文件并执行本地命令。普通聊天页面不因一句“安装”获得本机执行能力，不声称已经兼容所有 ChatGPT、DeepSeek 或豆包客户端。具体边界见 [COMPATIBILITY.md](COMPATIBILITY.md)。

## 两种用户意图

用户指定图形时，尊重其选择，确认所需变量和实验单位，把其数据映射到对应角色。不要为了自动推荐改换图形。

用户只提供数据和背景时，先理解想比较的对象、实验单位、独立/配对关系与测量尺度，再建议配方。字段名称匹配只是辅助；涉及配对、重复、分母、显著性来源的歧义需要澄清。小样本优先保留原始点。只问影响结论或输入正确性的问题。

需要宽表转长表时：

    node scripts/figure.mjs transform --project input.figure.json --action action.json --out output.figure.json

action 为 {"kind":"wideToLong","idColumn":"基因","valueColumns":["样本1","样本2"]}；过滤用 {"kind":"filter","column":"处理","equals":"对照"}，恢复原始表用 {"kind":"reset"}。外部预处理需保留原始文件，并在项目上下文中说明处理依据，不得把加工后的值冒充原始观测。

## 科学与呈现约束

- 火山图、MA、富集与区间图接收已有结果；不要从原始计数臆造 p 值、校正值、效应或置信区间。原始 RNA-seq 数据需另行完成经过说明的分析流程。
- 明确生物学重复与技术重复、SD/SEM/CI、原始或校正 p 值。项目不自动开展显著性检验。
- ROC、PR 与 survival 配方接收已有估计。kaplan_meier 配方接收个体编号、随访时间和0/1状态，使用 survival 计算右删失KM估计、95% log-log区间、删失标记与风险人数。只适用一人一行、共同起点、单终点；竞争风险、延迟入组与重复随访记录应另行分析。两种生存配方均不自动检验组间差异。曼哈顿默认阈值仅为示例。
- Bland–Altman 图使用独立受试者的一对测量，差值为第二种方法减第一种方法。一致性限界为均值差 ± 1.96 倍样本标准差，不是均值的置信区间；重复测量或非恒定误差需另行分析。均值区间图的 CI 为独立样本 t 区间，不能把技术重复当作独立样本。
- 坐标范围 xMin/xMax/yMin/yMax 的 null 表示自动。范围调整仅改变显示，不筛除计算数据；柱形及面积图保留零基线。groupOrder 按组名称排列，颜色仍按组名称绑定。
- 集合交集图按元素标识计算精确交集。三元图按行总和归一；雷达图不自动标准化。sankey 接受已有双阶段边，alluvial 要求每行完整三阶段路径及数量。网络和弦图仅展示无向正权重边。分类矩阵不把缺测当成未检出。
- 聚类树与树状热图使用欧氏距离，记录标准化及连接方法；树形不等于系统发育关系。PCA双标箭头为旋转载荷乘统一展示倍率，不能按得分坐标直接读取。平行坐标的0–1/标准分数缩放会记录方法。
- rarefaction 只接受真实整数个体计数，计算无放回抽样的期望物种数，不随机丢弃数据、不外推，不可使用归一化丰度。genomic_intervals 使用0基半开区间，先确认参考基因组和坐标约定。日历需有效YYYY-MM-DD、每日唯一，缺测不补零。
- cumulative_waterfall 按原行顺序累计增减；waterfall 是排序后的变化值，两者语义不同。paired_difference 的均值差95% t区间依赖独立配对与适当的差值分布假设。方向玫瑰图半径为频数平方根，面积编码频数。比例网格使用最大余数法舍入并保留实际比例图例。
- 模型诊断、漏斗、校准图使用已有结果。等高线要求完整等距网格；不静默插值。PCA 碎石和载荷图会实际计算，保留量纲处理设置。
- 网页外观即时预览会随后同步 R 精确图形。导出与交付使用实际 render 的结果，不截取同步中的临时外观图。
- 缺失值默认阻止绘图，只有用户选择或分析依据支持时启用 omitMissing。不可静默补零、剔除离群值或改变配对关系。
- UI 可切换中英文；内置模拟数据与图内文字为英文，默认 Times New Roman。不得为了切换界面语言而改写真实数据、科学标识符或用户标签。默认线宽0.5是ggplot尺度，不是0.5 pt。
- 模拟示例使用固定种子、非等差数值并标记模拟。将示例 CSV 再导入 create 时，在 spec 设置 "synthetic": true。真实数据与示例不得混用。
- 调整项目数据和参数，不生成任意 R 代码供后端执行。浏览器界面不调用模型、不保管 Token；推理使用用户当前智能体账户。

交付前运行 validate 与实际 render，检查预览、缺失记录和导出信息。告知实际完成的配方、数据整理及重要限制。若需求超出现有配方，明确指出并实现、验证新的 R 配方后再承诺支持。
