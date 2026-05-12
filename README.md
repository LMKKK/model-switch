# model-switch

在不同大语言模型提供商之间快速切换 Claude Code 的模型配置。

> 为什么不用cc-switch?
>
> - 喜欢用命令行
> - 只想切个模型，不需要额外复杂的功能(我只是想切模型，别动我其他配置项)
> - cc-switch有个恶心的点：当cc-switch处于模型配置的编辑页面时会监听配置文件的改动,此时在claude中更新配置(例如安装插件/skills等)是无效的，会强制被cc-switch更新为旧的(此功能太恶心了,被整过很多次了)

## 安装

```bash
bun install
bun run build
```

构建产物为 `dist/ms`，可将其移动到 `$PATH` 中的目录：

```bash
cp dist/ms /usr/local/bin/ms
```

## 用法

```
ms claude <command> [options]
```

### 子命令

| 命令                      | 说明                                         |
| ------------------------- | -------------------------------------------- |
| `ms claude list`          | 列出所有已保存的配置，标记当前激活项         |
| `ms claude add`           | 交互式新增模型配置                           |
| `ms claude remove`        | 交互式移除已保存的配置                       |
| `ms claude update <name>` | 逐项修改已有配置值                           |
| `ms claude use <name>`    | 激活指定配置，写入 `~/.claude/settings.json` |
| `ms claude current`       | 显示当前激活的配置名称及详情                 |

### 示例

```bash
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
```

## 配置存储

- 模型配置保存在 `~/.model-switch/configs/claude/settings.json`
- 激活配置时写入 `~/.claude/settings.json`，仅修改 ANTHROPIC\_\* 字段，保留其他设置不变
- 配置包含 7 个字段：`ANTHROPIC_BASE_URL`（必填）、`ANTHROPIC_AUTH_TOKEN`（必填）、`ANTHROPIC_MODEL`、`ANTHROPIC_REASONING_MODEL`、`ANTHROPIC_DEFAULT_OPUS_MODEL`、`ANTHROPIC_DEFAULT_HAIKU_MODEL`、`ANTHROPIC_DEFAULT_SONNET_MODEL`

## 开发

```bash
# 直接运行
bun run src/index.ts claude --help

# 类型检查
npx tsc --noEmit

# 构建二进制
bun run build
```
