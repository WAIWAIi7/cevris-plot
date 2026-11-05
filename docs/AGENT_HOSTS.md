# 智能体接入：DSH、豆包与其他本地宿主

绘图由本机 R 完成；模型推理使用用户当前宿主的账户。Cevris Plot 不接收或保存模型 Token。

## DeepSeek Harness（DSH）

依据 [DSH 官方 Skill 发现规则](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)，用户级目录为 `$DSH_HOME/skills`，项目级目录为 `.dsh/skills`。安装好 Cevris Plot 后，在应用目录执行：

```powershell
node scripts/register-skill.mjs --host dsh
```

没有全局 node 时，使用安装目录 `.runtime/node/node.exe`，或 `.runtime/runtime.json` 中记录的外部 Node。注册只写入一个指向应用的 Skill 入口，不复制 R、数据或账号设置，不安装 DSH 插件。刷新技能列表或新建会话后，让智能体读取 `cevris-plot`。可用 `--directory` 指定宿主实际采用的 skills 目录；不要把多个 DSH 桌面发行版的默认目录视为完全相同。

受限令牌安装使用 [安装说明](INSTALLATION.md) 中的预置包、外部 R、无窗口参数。首次检查 `doctor`；图片交付使用 `draw`，网页细调使用 `open --browser false` 并返回本地链接。宿主需要允许读取数据、写入安装/输出目录和启动 Node/R 子进程。不会修改 ACL、绕过宿主权限或关闭证书检查；若连 R 子进程都被禁止，应清楚报告宿主能力限制。

## 豆包

“豆包模型”“豆包网页聊天”“具备本地工具的桌面宿主”是不同运行条件。本项目提供同一套宿主无关的 SKILL.md、结构化 CLI 与本地网页：如果用户使用的版本支持导入本地 Skill 并执行命令，可在该客户端指定的目录注册：

```powershell
node scripts/register-skill.mjs --host doubao --directory "D:\MyAgent\skills"
```

这里的目录是示例，必须替换为该客户端真正识别的 Skill 目录。未确认豆包客户端版本和原生 Skill 接口前，不预设隐藏目录，也不宣称已获官方兼容认证。只有云端对话能力的客户端可帮助准备 CSV 或结构化绘图规格，然后由用户在本地网页导入；无法直接调用用户电脑的 `127.0.0.1` 服务。豆包模型通过有本地工具的宿主驱动本项目时，使用同一 CLI，不需要修改绘图引擎。

## 通用入口和覆盖保护

`--host agents` 使用 `~/.agents/skills`；`--host codex` 使用 `$CODEX_HOME/skills` 或 `~/.codex/skills`。已存在其他安装的同名 Skill 时默认停止；显式 `--replace` 会先保留带时间戳的备份。移动应用后应重新注册入口。普通聊天网页的自动安装、第三方插件商店上架、各宿主沙箱权限策略均不由此脚本改变。

验证范围：本地注册、路径转义、CLI 绘图和无窗口交接可自动测试；DSH/豆包的具体客户端端到端验收需要对应版本，不能用通用 CLI 测试代替。
