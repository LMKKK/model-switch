# model-switch

在不同 LLM 提供商之间快速切换 Claude Code / Codex CLI 的模型配置。

> 为什么不用 cc-switch?
>
> - 喜欢用命令行
> - 只想切个模型，不需要额外复杂的功能（我只是想切模型，别动我其他配置项）
> - cc-switch 有个恶心的点：当 cc-switch 处于模型配置的编辑页面时会监听配置文件的改动，此时在 Claude Code 中更新配置（例如安装插件/skills 等）是无效的，会强制被 cc-switch 覆盖为旧配置

## 安装

### npm 全局安装（推荐）

```bash
npm install -g model-switch
```

安装完成后即可直接使用 `ms` 命令。需要 Node.js >= 16。

### 从源码构建

```bash
bun install
bun run build
# 构建产物为 dist/ms.js，可将其添加到 PATH
```

## 用法

```
ms <provider> <command> [options]
```

`provider` 可选 `claude` 或 `codex`。

### Claude Code

| 命令                       | 说明                                         |
| -------------------------- | -------------------------------------------- |
| `ms claude list`           | 列出所有已保存的配置，标记当前激活项         |
| `ms claude add`            | 交互式新增模型配置                           |
| `ms claude remove`         | 交互式移除已保存的配置                       |
| `ms claude update <name>`  | 逐项修改已有配置值                           |
| `ms claude use <name>`     | 激活指定配置，写入 `~/.claude/settings.json` |
| `ms claude current`        | 显示当前激活的配置名称及详情                 |

### Codex CLI

| 命令                       | 说明                                              |
| -------------------------- | ------------------------------------------------- |
| `ms codex list`            | 列出所有已保存的配置，标记当前激活项              |
| `ms codex add`             | 交互式新增模型配置                                |
| `ms codex remove`          | 交互式移除已保存的配置                            |
| `ms codex update <name>`   | 逐项修改已有配置值                                |
| `ms codex use <name>`      | 激活指定配置，写入 `~/.codex/config.toml` 和 `~/.codex/auth.json` |
| `ms codex current`         | 显示当前激活的配置名称及详情                      |

### 示例

```bash
# === Claude Code ===

# 新增一个配置
ms claude add
# 按提示输入：配置名称 → Base URL → Auth Token → Model → ...

# 列出所有配置
ms claude list

# 激活配置
ms claude use my-config

# 查看当前激活
ms claude current

# 修改配置
ms claude update my-config

# 删除配置
ms claude remove

# === Codex CLI ===

# 新增一个 Codex 配置
ms codex add
# 按提示输入：配置名称 → Base URL → API Key → Model → ...

# 列出所有 Codex 配置
ms codex list

# 激活 Codex 配置
ms codex use my-codex-config

# 查看当前激活
ms codex current
```

## 配置存储

### Claude Code

- 模型配置保存在 `~/.model-switch/configs/claude/settings.json`
- 激活配置时写入 `~/.claude/settings.json`，仅修改 `ANTHROPIC_*` 字段，保留其他设置不变
- 配置包含 7 个字段：

| 字段                            | 必填 |
| ------------------------------- | ---- |
| `ANTHROPIC_BASE_URL`            | 是   |
| `ANTHROPIC_AUTH_TOKEN`          | 是   |
| `ANTHROPIC_MODEL`               | 否   |
| `ANTHROPIC_REASONING_MODEL`     | 否   |
| `ANTHROPIC_DEFAULT_OPUS_MODEL`  | 否   |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 否   |
| `ANTHROPIC_DEFAULT_SONNET_MODEL`| 否   |

### Codex CLI

- 模型配置保存在 `~/.model-switch/configs/codex/settings.json`
- 激活配置时写入 `~/.codex/config.toml`（模型/provider/URL 等）和 `~/.codex/auth.json`（API Key）
- 写入时保留 `config.toml` 和 `auth.json` 中的其他字段不变
- 配置包含 8 个字段：

| 字段                     | 说明             | 必填 |
| ------------------------ | ---------------- | ---- |
| `BASE_URL`               | API Base URL     | 是   |
| `OPENAI_API_KEY`         | API Key          | 否   |
| `CODEX_MODEL`            | 模型名称         | 否   |
| `CODEX_MODEL_PROVIDER`   | 模型提供商标识   | 否   |
| `CODEX_REVIEW_MODEL`     | Review 模型      | 否   |
| `CODEX_REASONING_EFFORT` | 推理强度         | 否   |
| `CODEX_VERBOSITY`        | 输出详细程度     | 否   |
| `CODEX_CONTEXT_WINDOW`   | 上下文窗口大小   | 否   |

## 开发

```bash
# 直接运行
bun run src/index.ts claude --help
bun run src/index.ts codex --help

# 类型检查
npx tsc --noEmit

# 构建 JavaScript
bun run build
```
