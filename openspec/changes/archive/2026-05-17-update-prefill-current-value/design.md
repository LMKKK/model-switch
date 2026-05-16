## Context

`ms claude update` 和 `ms codex update` 命令使用 `prompts` 库提示用户输入配置。当前提示格式为：
```
ANTHROPIC_BASE_URL [当前: xxx]
```
其中 `[当前: xxx]` 是冗余的，因为 `prompts` 的 `initial` 字段已经预填充了当前值，用户直接回车即可保留原值。

## Goals / Non-Goals

**Goals:**
- 移除 update 命令提示文字中的 `[当前：xxx]` 冗余信息

**Non-Goals:**
- 不改变任何功能逻辑，只改提示文字
- 不涉及其他命令（list/add/remove/use/current）

## Decisions

1. **只修改 message 字段**：将 `${KEY_LABELS[key]} [当前: ${currentValue || "(空)"}]` 改为 `${KEY_LABELS[key]}`
2. **保留 initial 字段**：用户仍可在输入框中看到并修改当前值

## Risks / Trade-offs

无风险——这是一个纯 UI 文本变更，不影响功能逻辑。