# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
bun run src/index.ts claude --help   # 直接运行（无需构建）
bun run src/index.ts codex --help    # Codex 子命令
npx tsc --noEmit                     # 类型检查
bun run build                        # 构建 JS 到 dist/ms.js
bun run compile                      # 编译为独立二进制到 bin/ms
```

无测试套件。

## 架构

TypeScript/Bun CLI 工具（`ms`），管理两套 LLM 提供商的模型配置切换：
- **Claude Code**（`ms claude`）：操作 `~/.claude/settings.json` 的 `env` 字段
- **Codex CLI**（`ms codex`）：操作 `~/.codex/config.toml` + `~/.codex/auth.json`

**入口**: `src/index.ts` — commander 注册 `ms claude` 和 `ms codex` 两个子命令树，各含 list / add / remove / update / use / current 六个操作。

**数据流（三层）**:
1. `~/.model-switch/configs/{provider}/settings.json` — 本工具的配置仓库，存储用户保存的多个配置（`{ models: { name: Config }, meta: { name: { addedAt, updatedAt } } }`）
2. 命令层（`src/commands/claude.ts` / `codex.ts`）— 交互式 UI（@inquirer/prompts），读写配置仓库
3. 目标文件层 — `use` 命令将选中配置写入实际生效文件，**保留目标文件中非本工具管理的字段**

**核心类型** (`src/types/index.ts`):
- `ModelConfig`（Claude）: 7 个 `ANTHROPIC_*` 字段，`ANTHROPIC_BASE_URL` 必填
- `CodexConfig`（Codex）: 8 个字段（`BASE_URL`、`OPENAI_API_KEY`、`CODEX_*`），`BASE_URL` 必填
- `Provider`: `"claude" | "codex"`

**配置激活流程** (`activateConfig` / `activateCodexConfig`):
读取目标文件 → 合并新配置 → 回填空值（从当前文件继承）→ 保留无关字段 → JSON 校验后写入。确保 `use` 命令不会破坏目标文件中的其他配置。

**JSON 安全写入** (`src/store/json-validate.ts`): 所有 JSON 写入经过序列化-反序列化校验，防止格式损坏。

**共享工具**:
- `src/commands/_shared.ts` — `computeDiffKeys` / `printDiffSection` 用于变更预览的 diff 计算与终端渲染
- `src/utils/prompt.ts` — `prefillInput`（预填充输入框）/ `detailSelect`（带详情的选择列表），封装 @inquirer/prompts

**Codex 特有**: Codex 的配置写入 TOML 格式（`smol-toml` 库），`remove` 命令会额外清理 `auth.json` 中的 provider 条目（`removeCodexProvider`）。
