# 安装、受限权限与磁盘空间

## 选择方式

1. 普通 Windows x64 用户：下载发布页的 `install-cevris-plot.cmd`，双击后输入任意可写安装目录，直接回车使用当前用户目录。首次安装需要联网。
2. 已下载 ZIP：解压 `cevris-plot.zip` 到任意可写目录，双击 `首次安装.cmd`。发布 ZIP 自带编译后的网页，不需要用户重新构建。环境准备完成后，整个目录可以保留在该位置运行。
3. 智能体或受限环境：用下列 PowerShell 参数进行无窗口部署。不会运行官方 R 安装器，不写 R 注册表、不创建开始菜单条目，也不会等待安装模态框。

以后运行 `start.cmd`。创建开始菜单入口是独立可选项 `-CreateShortcut`；失败只提示，不影响安装结果。`-Launch` 可打开网页；无人值守时不要传入。命令失败返回非零状态；默认不等待按键，人工排错可设置 `CEVRIS_PAUSE_ON_ERROR=1`。

## 外部 Node / R 与预置文件

以下命令在解压后的应用目录运行。R 解释器支持参数 `-Rscript` 或环境变量 `FIGURE_RSCRIPT`，并保存到本应用 `.runtime/runtime.json`，以后网页和 CLI 都会复用。已有 R 库可用 `-RLibrary` 指定，不会安装到该外部目录。Node 24 可通过 `FIGURE_NODE` 指定。如果智能体只附带 `node.exe`、没有 npm，安装器会用它下载文件，然后自动部署完整的私有 Node；不需要修改智能体自带的运行库。

```powershell
$env:FIGURE_NODE = 'D:\Tools\node\node.exe'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1 -Rscript 'D:\Tools\R\bin\x64\Rscript.exe' -RLibrary 'D:\Tools\R-library'
```

不能访问网络时，可预置官方 Node ZIP、R EXE 和 innoextract ZIP；版本及 SHA-256 见 [固定运行库清单](../scripts/runtime-manifest.json)。**R EXE 只作为数据解包，绝不执行。**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install.ps1 -NodeArchive 'D:\Packages\node-v24.22.2-win-x64.zip' -RInstaller 'D:\Packages\R-4.6.2-win.exe' -ExtractorArchive 'D:\Packages\innoextract-1.9-windows.zip'
```

已准备所有依赖后再加 `-Offline`，禁止安装阶段下载。首次全离线部署还必须已有与 `package-lock.json` 对应的 Node 依赖/npm 缓存，以及齐全的 R 库；三个运行库压缩包不包含所有 npm / R 扩展包。可在联网电脑完整准备一次并转移整个应用目录；内部运行库使用相对路径，外部解释器和外部 R 库则需在新电脑重新指定。不要删除转移目录中的依赖状态文件。

独立下载的 `install-cevris-plot.ps1` 支持相同预置参数，还可设置目的地与本地发布包：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File install-cevris-plot.ps1 -InstallDir 'D:\Research Apps' -ArchivePath 'D:\Packages\cevris-plot.zip' -NoLaunch
```

`.cmd` 也接受第一个参数作为目录：`install-cevris-plot.cmd "D:\Research Apps"`。自动化使用 `.ps1`；若必须使用 `.cmd`，设置 `CEVRIS_UNATTENDED=1` 关闭目录提问、`CEVRIS_NO_LAUNCH=1` 关闭打开网页。

## 下载与受限环境

可用 Node 时，发布包、运行库、CRAN 包索引及 Windows R 二进制扩展包优先通过 Node/OpenSSL HTTPS 下载；支持标准代理环境变量、重试、重定向、超时和临时文件校验。不会关闭 TLS 校验。尚无 Node 时才尝试 Windows 下载客户端；Windows TLS 不可用时请提供 `FIGURE_NODE` 或 `-NodeArchive`。

R 安装器摘要固定在版本化清单中，不再要求每个 CRAN 镜像提供校验文本；某镜像缺少校验文件不会阻止使用它的已固定版本 EXE。下载版本不匹配会拒绝解包。R 扩展包若索引未提供整个 ZIP 的 MD5，则验证包内文件清单，和固定 R EXE 的 SHA-256 校验是两个层次。

发布 ZIP 使用现成 `build` 文件。从 GitHub 克隆或安装源码 Skill 时，优先下载同版本、SHA-256 固定的 `cevris-plot-frontend.zip`，也不要求构建工具。运行依赖使用 `npm ci --ignore-scripts --omit=dev`，避免生命周期脚本启动受限子进程；已安装且锁文件一致时不重复安装。只有明确 `-Rebuild`，或预编译网页不可用时才尝试本地构建。重建失败时只有存在完整的原始网页文件才降级为提示，缺少网页或必需运行依赖仍会报错，不会把无法运行的安装报告成成功。离线源码部署可将对应前端 ZIP 放入 `.runtime/cache/`，或直接使用包含 build 的发布 ZIP。

需要操作系统允许启动 Node、R 和解包器进程，并能读写所选目录。文件部署不要求管理员或注册表权限，但不能让完全禁止子进程的宿主获得执行能力。

## 日志、修复与重复安装

- 安装日志默认 `.data/install.log`；独立引导器另写安装目标下的 `bootstrap.log`。`-LogPath` 可指定日志文件。
- 子进程有超时，超时会结束本次启动的进程树并报错，不运行安装器 GUI，也不等待无限按键。
- 安装锁阻止同目录并发安装。已验证运行库和依赖会复用；重复安装保留 `.data`、用户项目和外部 R。
- 解压先进入唯一暂存目录，通过运行验证后才移入运行库位置；失败清理本次暂存目录。旧的不完整 Node/R 目录以 `*.incomplete-*` 保留，供用户确认后删除。
- 成功后自动清理内部下载缓存和安装临时文件，保留空的 `.runtime/tmp` 供首次启动的 R 使用；`-KeepDownloads` 保留下载文件以便离线准备。不会删除由参数指定的外部文件。
- 默认做一次实际四格式绘图检查；`-VerifyAll` 可重新生成和验证全部 105 个模板。

## 为什么之前要求 2 GB？

旧值是安装峰值的保守预算，包含 Node/R 安装包、解压目录、R 库、npm 缓存，以及当时未清理的重复副本；不是应用固定占用，也不是每次运行所需。旧版把这个预算做成硬门槛，复用已有环境时尤其不合理。

新版取消固定 2 GB 拦截，按缺少的组件显示预计新增空间，并把下载和临时文件放在目标磁盘。预算初值为应用依赖/临时空间 100 MiB，缺少 Node 时加 220 MiB，缺少 R 时加 550 MiB；这是提示性估算，依赖版本、缓存和用户数据会改变实际占用。最终磁盘实测随发布验收记录公布。若已有 Node/R 及所需库，所需新增空间会明显减少。
