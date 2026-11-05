# 数据上传 / Data import

在图表库选择图形，点击“导入数据”。窗口会显示该图真实使用的示例列、数据行和必需字段。可先下载示例 CSV，在本地表格软件中替换数据再上传。列名不必与示例相同，导入后可选择对应关系；应用不会自动翻译用户的标签。

Choose a chart, then **Import data** to see its required fields and actual example rows. Download the example CSV or prepare your own table. Column names may differ: map their meanings after import. User labels are preserved.

| 文件 / File | 读取方式 / Reading |
|---|---|
| CSV | UTF-8（推荐）或 GB18030 / GBK；逗号、制表符、分号分隔 / UTF-8 recommended; comma, tab or semicolon |
| TSV | 制表符分隔；UTF-8 或 GB18030 / Tab-delimited |
| TXT | 结构化表格，逗号、制表符或分号分隔 / Delimited table, not free prose |
| XLSX | 选择工作表；自动跳过空的首张表 / Select a worksheet; empty first sheets are skipped |

单文件最多 **10 MiB（界面简称10MB）、30,000行数据、100列**。第一行必须为唯一且非空的列名，不添加跨列标题或合并单元格；完全空行会跳过。每个列名最多100字符，文本单元格最多2000字符。测量列只填数值，单位放在列名中；缺失值留空，由绘图校验提示处理，不自动填零。文本数字使用小数点，例如 `12.73`。

Maximum: **10 MiB, 30,000 data rows, 100 columns**. Use unique, nonempty headers in the first row; no merged cells or title rows. Fully empty rows are skipped. Column names allow up to 100 characters and text cells up to 2,000. Put numeric measurements in numeric columns and units in headers. Leave missing values blank; they are not replaced with zero. Use a decimal point, e.g. `12.73`.

Excel 公式需有已计算的缓存结果。请在 Excel 等软件中重新计算并保存，或复制后粘贴为数值。旧版 XLS 请另存为 XLSX。图片、PDF、Word、Prism 文件和原始 FASTQ/BAM 不属于表格上传格式。`.figure.json` 是项目文件，请从“我的项目 → 打开本地项目文件”恢复，不要作为数据表上传。

Excel formulas need cached values: recalculate and save, or paste as values. Convert legacy XLS to XLSX. Images, PDF, Word, Prism and raw FASTQ/BAM are not tabular inputs. Open `.figure.json` through **My projects → Open local project file**, not data import.

XLSX 还限制解压后总大小为 64 MiB、内部文件数量为 4096；过大的工作簿请另存为 CSV 或拆分工作表。项目及组图请求上限为 64 MiB，包含为复现保留的原始数据。达到限制时请减少数据或拆分组图，不会静默截断数据。

XLSX files are also limited to 64 MiB expanded and 4,096 internal entries. Save large workbooks as CSV or split sheets. Project and composition requests allow up to 64 MiB including preserved original data; reduce data or split panels if needed. Data is never silently truncated.

## 不同图形需要不同数据 / Chart-specific data

| 图形 / Chart | 每行代表什么 / One row represents |
|---|---|
| 柱状+散点、箱线、小提琴、云雨 / Bar with points, box, violin, raincloud | 一个独立样本及其分组和测量值；不要提交“均值±SD”文本 / An independent observation with group and numeric value, not mean ± SD text |
| 分组云雨 / Grouped raincloud | 一个独立样本，另加系列列；每个分组组合的密度层至少3条观测且有数值变化 / An observation plus a series column; density requires ≥3 observations with variation in each combination |
| 配对图 / Paired | 个体在一个条件下的测量，保留个体编号 / A subject measured in one condition; keep subject IDs |
| 热图 / Heatmap | 一个行×列单元格及其数值；宽矩阵可在导入后展开 / A row–column cell and value; wide matrices can be reshaped |
| PCA | 一个样本，多列数值特征 / One sample, multiple numeric features |
| 火山图 / Volcano | 已完成差异分析的基因及 log2FC、P或校正P；P在(0,1]，不是 -log10(P) / Precomputed gene result with log2FC and P or adjusted P in (0,1], not -log10(P) |
| Kaplan–Meier | 个体随访时间及事件状态：事件1、右删失0 / An individual with follow-up time and event=1 or right-censored=0 |
| 日历 / Calendar | 一个 YYYY-MM-DD 日期及数值 / A YYYY-MM-DD date and numeric value |

完整图形清单见 [CATALOG.md](CATALOG.md)。其他图以导入窗口的实际字段说明和示例为准。模拟数据仅用于学习，不是实验结果。

See [CATALOG.md](CATALOG.md) and each chart's import panel for the complete contract. Demonstration data is synthetic, not experimental evidence.

## 导出 / Export

- SVG / PDF：矢量图；SVG文字保持可编辑，查看设备需有对应字体。
- PNG / TIFF：按物理尺寸和 DPI 输出位图。
- `.figure.json`：保留数据、映射和参数，在本工具继续编辑。
- 复现 ZIP：保留原始数据、整理后的数据、R程序和版本信息；另附运行环境要求。

SVG/PDF are vector exports; PNG/TIFF are raster exports at the requested size and DPI. `.figure.json` restores editing in this app. The reproduction ZIP includes original and transformed data, R source, settings and version information. Project files and reproduction bundles contain data: share only the outputs you intend to share.
