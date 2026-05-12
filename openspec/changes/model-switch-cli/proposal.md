## Why

在不同的大语言模型提供商之间切换 Claude Code 的模型配置需要手动编辑 `~/.claude/settings.json`，操作繁琐且容易出错。这个 CLI 工具将配置管理标准化，让开发者可以在多个模型提供商配置之间快速切换。

## What Changes

- 新增 `ms` 命令行工具，包含 `claude` 子命令组
- `ms claude list` — 列出 `~/.model-switch/configs/claude/settings.json` 中所有已保存的配置名称及详情
- `ms claude add` — 交互式新增模型配置，保存 ANTHROPIC_BASE_URL、ANTHROPIC_AUTH_TOKEN、ANTHROPIC_MODEL、ANTHROPIC_REASONING_MODEL、ANTHROPIC_DEFAULT_OPUS_MODEL、ANTHROPIC_DEFAULT_HAIKU_MODEL、ANTHROPIC_DEFAULT_SONNET_MODEL 共 7 项设置
- `ms claude remove` — 交互式移除已保存的模型配置
- `ms claude update <config-name>` — 更新已有模型配置
- `ms claude use <config-name>` — 将指定配置写入 `~/.claude/settings.json`
- `ms claude current` — 显示 `~/.claude/settings.json` 中当前激活的配置名称及详情
- 配置存储格式：`~/.model-switch/configs/claude/settings.json`，根对象 `models` 下以配置名为 key，值为上述 7 项配置的对象
- 使用 TypeScript 开发，Bun 作为运行时，最终通过 `bun build --compile` 生成独立二进制文件

## Capabilities

### New Capabilities

- `cli-core`: `ms` 命令行入口，子命令注册与路由（list / add / remove / use）
- `config-manager`: 配置文件读取、写入、增删改查操作
- `config-store`: 配置数据模型定义，`~/.model-switch/configs/claude/settings.json` 持久化存储

### Modified Capabilities

（无现有能力需要修改）

## Impact

- 仅新增文件，不修改现有代码
- 技术栈：TypeScript + Bun 运行时
- 依赖：commander（CLI 框架）、chalk（终端彩色输出）、prompts（轻量交互式输入）
- 构建产物：单文件二进制，通过 `bun build --compile` 生成
