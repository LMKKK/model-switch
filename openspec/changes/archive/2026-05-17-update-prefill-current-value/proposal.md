## Why

在执行 `update` 命令时，每项配置提示中显示 `[当前：xxx]` 是多余的。用户已经在 `initial` 字段中看到了当前值（输入框会预填充），没必要在提示文字中重复展示。这种冗余信息增加了认知负担，用户只需看到配置名称即可直接修改。

## What Changes

- `claude.ts` 和 `codex.ts` 的 update 命令中，移除提示文字里的 `[当前：xxx]` 部分
- 输入框的 `initial` 值保持不变，用户仍可直接基于当前值修改

## Capabilities

### New Capabilities
- 无新增 capability

### Modified Capabilities
- 无 spec 级别的需求变更

## Impact

- `src/commands/claude.ts` — update 命令的 prompts 提示文字
- `src/commands/codex.ts` — update 命令的 prompts 提示文字