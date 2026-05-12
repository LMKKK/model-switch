# settings-env-scope Specification

## Purpose
TBD - created by archiving change bugfix-settings-env. Update Purpose after archive.
## Requirements
### Requirement: Read ANTHROPIC config from env field

系统 SHALL 从 `~/.claude/settings.json` 的 `env` 字段下读取所有 `ANTHROPIC_*` 配置项。

#### Scenario: settings.json 存在且 env 字段包含完整配置

- **WHEN** 调用 `readClaudeSettings()` 且 `settings.json` 的 `env` 字段包含 `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN` 等键
- **THEN** 系统返回包含这些键值对的 `Partial<ModelConfig>` 对象

#### Scenario: settings.json 的 env 字段不存在

- **WHEN** 调用 `readClaudeSettings()` 且 `settings.json` 没有 `env` 字段
- **THEN** 系统返回空对象 `{}`

#### Scenario: env 字段中缺少某些 ANTHROPIC 键

- **WHEN** 调用 `readClaudeSettings()` 且 `env` 字段中仅包含部分 ANTHROPIC 键
- **THEN** 系统仅返回存在的键值对，不包含缺失的键

### Requirement: Write ANTHROPIC config to env field

系统 SHALL 将所有 `ANTHROPIC_*` 配置项写入 `~/.claude/settings.json` 的 `env` 字段下。

#### Scenario: 激活配置时写入 env 字段

- **WHEN** 调用 `activateConfig()` 激活一个包含 7 个 ANTHROPIC 键的配置
- **THEN** 写入后 `settings.json` 的 `env` 字段包含这 7 个键，顶层不包含这些键

#### Scenario: 保留 env 中已有的非 ANTHROPIC 键

- **WHEN** 调用 `activateConfig()` 且现有 `settings.json` 的 `env` 字段包含其他键（如 `CLAUDE_CODE_DISABLE_TERMINAL_TITLE`）
- **THEN** 写入后这些非 ANTHROPIC 键保留在 `env` 字段中

#### Scenario: 保留顶层非 ANTHROPIC 字段

- **WHEN** 调用 `activateConfig()` 且现有 `settings.json` 顶层包含 `enabledPlugins`、`hooks`、`mcpServers` 等字段
- **THEN** 写入后这些顶层字段保持不变

#### Scenario: 回填空值从 env 字段读取

- **WHEN** 激活的配置中某些 ANTHROPIC 键为空且当前 `env` 字段中存在对应值
- **THEN** 系统使用 `env` 字段中的现有值回填

