## Why

`ms claude list` 当前仅展示 Base URL 和 Model 两项，用户无法快速了解每个配置的推理模型与默认模型设置。展示完整信息能帮助用户在切换配置前做出正确选择。

## What Changes

- `ms claude list` 输出增加 ANTHROPIC_REASONING_MODEL、ANTHROPIC_DEFAULT_OPUS_MODEL、ANTHROPIC_DEFAULT_SONNET_MODEL、ANTHROPIC_DEFAULT_HAIKU_MODEL 四项的展示
- 未设置的字段显示 `(未设置)`，保持与现有风格一致

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `cli-core`: list 命令的输出内容变更，从展示 2 项增加到展示 6 项

## Impact

- `src/commands/claude.ts` — `listCommand` 函数，新增 4 行 console.log 输出
