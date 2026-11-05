# Integration and coverage / 集成与覆盖

Cevris Plot is the project name; `cevris-plot` is its repository, package and portable Skill identifier. The name does not imply an official integration with a model provider.

## Two supported workflows

| Workflow | Current implementation | Requirements |
| --- | --- | --- |
| Agent → finished image | `inspect` → an agent writes a specification → `draw` returns image, metadata and editable project paths | An agent host with local file and process access, plus installed R/Node dependencies |
| Agent → browser editor | `open --project …` saves a new local copy and returns a link directly to the editor | The local application is installed; no model key is stored in the browser |
| Browser without AI | Choose a chart, inspect/download its CSV, import CSV/TSV/XLSX, map fields, edit and export | Local runtime; works offline after installation |

Codex and other local tool-enabled agent hosts can read the Skill and invoke the CLI. A model such as DeepSeek can drive it through an appropriate tool-enabled host. Simply typing “install this Skill” into an ordinary chat window does not grant that chat access to this computer or install R. ChatGPT, DeepSeek and Doubao consumer chat integrations have **not** been certified. Provider-specific connectors or hosted execution would require separate adapters, deployment and validation. A local URL on the user's machine is not reachable from a remote model service.

AI calls use the user's chosen agent account or API configuration. The standalone UI performs no LLM requests and stores no API keys. Local scientific calculations and offline chart recommendations need no tokens.

## Screenshot-reference coverage

The supplied ChiPlot screenshots inform navigation and parameter organization; their code and images are not bundled. All 105 displayed templates are backed by R implementations. Variants are explicitly counted as templates, not 105 unrelated statistical methods.

| Reference area | Current support | Still outside this release |
| --- | --- | --- |
| Bar, distribution, scatter, lines | Means + points, plain/error/horizontal/outline/sorted/labeled bars, grouped variants, grouped stacks, same-axis bar + reference line, box/violin/raincloud, density, paired trajectories | Dual-axis combinations intentionally require a separate justified design |
| Heatmaps | Standard, clustered, circular, correlation, correlation bubbles, binary, calendar, categorical matrix | Mantel-link analysis; cross-table correlation with independent table imports |
| Ordination | Actual PCA scores, scree, loadings, biplot; numeric multivariate views | PCoA, NMDS, CCA and RDA workflows |
| Omics | Precomputed volcano, MA, enrichment bubbles, Manhattan; genomic interval tracks | MEME motif/NCBI domain parsers, gene-cluster arrows, synteny, circular genome/enrichment composites |
| Trees | Hierarchical clustering / dendrogram | Newick phylogenetic tree import and circular/unrooted phylogenetic layouts |
| Networks and sets | Circular network, weighted chord, two-stage Sankey, three-stage alluvial, exact UpSet | Force-directed interactive network; Venn/Euler region layouts |
| Geographic plots | None shown in the library | GIS files, projections and map layers |

Each future addition needs an input contract, English simulated data, real R renderer, parameter semantics and numerical checks. An unrelated existing chart is not relabeled to suggest support.

## 中文说明

目前两条链路都已实现：本地智能体可直接拿到图片，也可把同一份可编辑项目交到网页；普通用户可以全程不用 AI。普通聊天网页不能仅凭一句话取得本机执行权限，因此暂不宣称已经适配所有 ChatGPT、DeepSeek 或豆包客户端。

参考图中的系统发育、地理地图、Mantel、PCoA/NMDS/CCA/RDA、专用序列注释与共线性工作流仍待独立实现。当前图表库只展示可运行模板。

## Composition and source export (0.7.0)

All 105 R templates can be used as panels and exported as standalone R source. Compositions use native ggplot/grid objects in a bounded grid, not raster stitching. The code includes data, parameters and the full implementation; required R packages and fonts must be available. See [supported controls and limits](COMPOSITION.md).

Prism export, its API and CLI commands have been removed. This release does not promise native Prism files. Existing `.figure.json` / `.composition.json` files and the original Figure Studio browser draft database remain usable after the Cevris Plot rename.
