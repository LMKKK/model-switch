## Context

当前 Claude Code 的模型配置（ANTHROPIC_BASE_URL、ANTHROPIC_AUTH_TOKEN 等）直接写入 `~/.claude/settings.json`。用户在不同模型提供商之间切换时需要手动编辑 JSON。本工具将配置管理抽离，通过 CLI 实现快速切换。

## Goals / Non-Goals

**Goals:**
- 通过 `ms claude` 子命令管理多套模型配置（list / add / remove / update / use / current）
- 配置独立存储在 `~/.model-switch/configs/claude/settings.json`
- `use` 将选中配置合并写入 `~/.claude/settings.json`，settings.json 不存在时交互式创建
- `current` 显示当前激活配置的名称及详情（从 settings.json 反向匹配）
- `update` 交互式修改已有配置的 7 项值
- 配置值为空时，从 `~/.claude/settings.json` 回填并提示用户
- 输出为独立二进制文件（bun build --compile）

**Non-Goals:**
- 不支持远程同步或加密存储
- 不提供 GUI 界面
- 不管理 Claude Code 除模型配置以外的其他 settings 字段
- 不实现配置导入/导出

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| CLI 框架 | commander | 成熟稳定，声明式 API，Bun 兼容 |
| 交互式输入 | prompts | 比 inquirer 更轻量（~5KB），原生 ESM |
| 终端输出 | chalk | 区分状态（成功绿色、错误红色、配置名高亮） |
| 构建工具 | `bun build --compile` | 零配置，生成原生二进制 |
| 包管理器 | bun | 与运行时一致 |
| 配置格式 | JSON | 与 settings.json 同格式 |
| 空值回填策略 | 读取 settings.json 当前值 | 避免用户手动重复输入已生效的值 |
| settings.json 不存在时 | 交互确认后创建 | 不自动创建文件，尊重用户意图 |
| current 匹配策略 | 将 settings.json 中 7 项值组合与 models 中各配置逐一比对 | 全匹配才算激活，显示匹配到的配置名 |

## Risks / Trade-offs

- **JSON 格式不支持注释**：用户无法在配置文件中写注释 → add 命令引导用户输入有意义的配置名来标识用途
- **Token 明文存储**：ANTHROPIC_AUTH_TOKEN 以明文存储 → 提示用户注意文件权限（`chmod 600`）
- **空值回填可能读到过期值**：settings.json 可能已被其他工具修改 → 回填时明确提示"已从当前 settings.json 读取值为: xxx"
- **current 匹配失败**：当 settings.json 值与任何已保存配置都不完全匹配 → 显示为 "unknown（手动修改）" 并列出当前值
