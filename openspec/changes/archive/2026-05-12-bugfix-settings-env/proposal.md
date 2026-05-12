## Why

`model-switch` 将 7 个 `ANTHROPIC_*` 环境变量写入 `~/.claude/settings.json` 的顶层，而 Claude Code 期望它们位于 `env` 字段下。这导致切换模型后，Claude Code 无法读取这些配置，模型切换功能完全失效。

## What Changes

- **修复读取逻辑**：`readClaudeSettings()` 从 `data.env[key]` 而非 `data[key]` 读取配置值
- **修复写入逻辑**：`activateConfig()` 将 7 个键写入 `newSettings.env` 字段而非顶层，同时保留 `env` 中已有的其他键
- **JSON 格式校验**：在内存中构建完整的 JSON 对象后，先序列化并反序列化验证格式正确，确认无误后再写入 `~/.claude/settings.json` 和 `~/.model-switch/config/claude/settings.json`

## Capabilities

### New Capabilities

- `settings-env-scope`: 确保所有 ANTHROPIC_* 配置项正确读写于 `~/.claude/settings.json` 的 `env` 字段下
- `json-format-validation`: 写入 JSON 文件前，在内存中先校验 JSON 格式合法性，校验通过后才写入磁盘

### Modified Capabilities

<!-- 无现有 spec 需要修改 -->

## Impact

- `src/store/claude-settings.ts` — `readClaudeSettings()` 和 `activateConfig()` 需修改读/写路径
- `src/store/config.ts` — 写入操作前需增加内存 JSON 格式校验
