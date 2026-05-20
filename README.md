# model-switch

在不同 LLM 提供商之间快速切换 Claude Code / Codex CLI 的模型配置。

> 为什么不用 cc-switch?
>
> - 喜欢用命令行
> - 我只是想切模型，别动我其他配置项, 不需要繁琐臃肿的操作
> - cc-switch非常难用且繁琐：
>   - 每次更改模型配置时需要反复勾选"写入通用配置",有时候忘记勾选，就会导致本地配置文件被覆盖,多了或漏了很多配置项,而且还不能立即发现此问题,只有用到某个skill或plugin的时候才发现配置文件错了
>   - 在claude中自动安装了skills,plugin后,必须回到cc-switch的通用配置编辑页面手动"提取通用配置",否则你新增的配置项无法被cc-switch感知到,在切换模型时配置文件又被强制覆盖成旧版本了,恶心; 而且提取通用配置还经常提取不到
>   - 当cc-switch停留在编辑配置页面时,你无法手动更改claude配置文件,一回到cc-switch的页面就又强制覆盖回旧的配置

## 安装

### npm 全局安装（推荐）

```bash
npm install -g model-switch
```

安装完成后即可直接使用 `ms` 命令。需要 Node.js >= 16。

### 从源码构建

```bash
bun install
bun run build        # 构建 JS 到 dist/ms.js
bun run compile      # 编译为独立二进制到 bin/ms（无需 Node.js 运行时）
```

## 用法

```
ms <provider> <command> [options]
```

`provider` 可选 `claude` 或 `codex`。

### Claude Code

| 命令                           | 说明                                         |
| ------------------------------ | -------------------------------------------- |
| `ms claude list`               | 列出所有已保存的配置，标记当前激活项         |
| `ms claude add`                | 交互式新增模型配置                           |
| `ms claude remove`             | 交互式移除已保存的配置（Tab 预览详情）       |
| `ms claude update [name]`      | 逐项修改已有配置值（无参数时交互选择）       |
| `ms claude use [name]`         | 激活指定配置（无参数时交互选择）             |
| `ms claude current`            | 显示当前激活的配置名称及详情                 |

### Codex CLI

| 命令                          | 说明                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| `ms codex list`               | 列出所有已保存的配置，标记当前激活项                              |
| `ms codex add`                | 交互式新增模型配置                                                |
| `ms codex remove`             | 交互式移除已保存的配置（Tab 预览详情）                            |
| `ms codex update [name]`      | 逐项修改已有配置值（无参数时交互选择）                            |
| `ms codex use [name]`         | 激活指定配置（无参数时交互选择）                                  |
| `ms codex current`            | 显示当前激活的配置名称及详情                                      |

### 交互操作

- `update`、`use`、`remove` 命令均支持省略配置名称，进入交互式选择列表
- 在选择列表中按 **Tab** 可预览该配置的完整详情
- `current` 命令会自动匹配当前生效的配置，支持按指纹（URL + Token/Key）模糊识别

### 示例

```bash
# === Claude Code ===

# 新增一个配置
ms claude add
# 按提示输入：配置名称 → Base URL → Auth Token → Model → ...

# 列出所有配置
ms claude list

# 激活配置（两种方式）
ms claude use my-config     # 直接指定
ms claude use               # 交互式选择，Tab 预览详情

# 查看当前激活
ms claude current

# 修改配置（两种方式）
ms claude update my-config  # 直接指定
ms claude update            # 交互式选择

# 删除配置
ms claude remove            # 交互式选择，Tab 预览详情

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

| 字段                             | 必填 |
| -------------------------------- | ---- |
| `ANTHROPIC_BASE_URL`             | 是   |
| `ANTHROPIC_AUTH_TOKEN`           | 否   |
| `ANTHROPIC_MODEL`                | 否   |
| `ANTHROPIC_REASONING_MODEL`      | 否   |
| `ANTHROPIC_DEFAULT_OPUS_MODEL`   | 否   |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 否   |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL`  | 否   |

### Codex CLI

- 模型配置保存在 `~/.model-switch/configs/codex/settings.json`
- 激活配置时写入 `~/.codex/config.toml`（模型/provider/URL 等）和 `~/.codex/auth.json`（API Key）
- 写入时保留 `config.toml` 和 `auth.json` 中的其他字段不变
- 配置包含 8 个字段：

| 字段                     | 说明           | 必填 |
| ------------------------ | -------------- | ---- |
| `BASE_URL`               | API Base URL   | 是   |
| `OPENAI_API_KEY`         | API Key        | 否   |
| `CODEX_MODEL`            | 模型名称       | 否   |
| `CODEX_MODEL_PROVIDER`   | 模型提供商标识 | 否   |
| `CODEX_REVIEW_MODEL`     | Review 模型    | 否   |
| `CODEX_REASONING_EFFORT` | 推理强度       | 否   |
| `CODEX_VERBOSITY`        | 输出详细程度   | 否   |
| `CODEX_CONTEXT_WINDOW`   | 上下文窗口大小 | 否   |

## 开发

```bash
# 直接运行
bun run src/index.ts claude --help
bun run src/index.ts codex --help

# 类型检查
npx tsc --noEmit

# 构建 JavaScript
bun run build

# 编译为独立二进制（无需 Node.js 运行时）
bun run compile
```
