# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
bun run src/index.ts claude --help   # 直接运行（无需构建）
npx tsc --noEmit                     # 类型检查
bun run build                        # 构建二进制到 dist/ms
```

无测试套件。

## 架构

这是一个 TypeScript/Bun CLI 工具，用于在不同 LLM 提供商之间快速切换 Claude Code 的模型配置。

**入口**: `src/index.ts` — 使用 `commander` 注册 `ms claude` 命令树（list / add / remove / update / use / current）。

**数据存储（两个文件，职责不同）**:
- `~/.model-switch/configs/claude/settings.json` — 工具自身的配置仓库，存储用户保存的多个模型配置（`{ models: { name: ModelConfig } }`），由 `src/store/config.ts` 读写
- `~/.claude/settings.json` — Claude Code 的实际配置文件，`use` 命令将选中的配置写入其 `env` 字段（仅写入 ANTHROPIC_* 键，保留 `env` 中的非 ANTHROPIC 键及其他顶层字段），由 `src/store/claude-settings.ts` 读写

**核心类型** (`src/types/index.ts`): `ModelConfig` 包含 7 个字段，均为 `ANTHROPIC_` 前缀的环境变量名。`ANTHROPIC_BASE_URL` 和 `ANTHROPIC_AUTH_TOKEN` 为必填，其余可选。

**JSON 安全写入** (`src/store/json-validate.ts`): 所有 JSON 写入操作均经过序列化-反序列化校验，防止写入格式损坏的配置文件（`bugfix-settings-env` 变更引入）。

**配置激活流程** (`activateConfig`): 读取现有 `settings.json` → 合并新配置 → 回填空值字段（从当前 settings 继承）→ 保留非 ANTHROPIC 字段 → 校验后写入。这确保 `use` 命令不会破坏 settings.json 中的其他配置。
