## Context

`ms claude list` 当前输出每个配置的 Name、Base URL、Model 三项。ModelConfig 包含 7 个字段，其余 4 个（Reasoning Model、Default Opus/Haiku/Sonnet Model）未展示。这是纯展示层改动，不涉及数据模型或存储变更。

## Goals / Non-Goals

**Goals:**
- `list` 命令输出增补 4 个模型字段，让用户一览配置全貌

**Non-Goals:**
- 不改变数据存储格式
- 不调整输出交互方式（非交互式选择、过滤等）
- 不修改 `current`、`add`、`update` 等其他命令

## Decisions

- **追加输出行，保持现有格式**：在 `Model:` 行后追加 4 行 `chalk.dim()` 输出，字段名对齐现有 `KEY_LABELS`。不需要重构或抽取函数。
- **未设置时显示 `(未设置)`**：与现有 `ANTHROPIC_MODEL || "(未设置)"` 模式一致。

## Risks / Trade-offs

- 输出行数从每个配置约 3 行增加到约 7 行，终端输出变长。这是可接受的，因为配置数量通常不超过 10 个。
