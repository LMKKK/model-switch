## Context

`~/.claude/settings.json` 的正确结构要求环境变量存放在 `env` 字段下：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "...",
    ...
  },
  "enabledPlugins": { ... },
  ...
}
```

当前 `model-switch` 将这 7 个键写入 JSON 顶层，导致 Claude Code 无法识别配置。

涉及的文件：
- `src/store/claude-settings.ts` — 读取/写入 `~/.claude/settings.json`
- `src/store/config.ts` — 读取/写入 `~/.model-switch/configs/claude/settings.json`

## Goals / Non-Goals

**Goals:**
- 修复 `readClaudeSettings()` 从 `data.env` 读取 ANTHROPIC_* 键
- 修复 `activateConfig()` 将 ANTHROPIC_* 键写入 `newSettings.env`
- 写 JSON 文件前在内存中校验格式合法性
- 保留 settings.json 中所有非 ANTHROPIC 字段不变

**Non-Goals:**
- 不修改 `ModelConfig` 类型定义（内部扁平结构保持不变）
- 不修改 CLI 命令层（`src/commands/claude.ts`）
- 不做历史数据的自动迁移

## Decisions

### 1. 读取路径：`data.env?.[key]` 而非 `data[key]`

`readClaudeSettings()` 第 35 行将 `data[key]` 改为 `data.env?.[key]`。
如果 `data.env` 不存在则返回空对象 `{}`。

### 2. 写入路径：`newSettings.env = merged` 而非 `Object.assign(newSettings, merged)`

`activateConfig()` 中：
- 保留非 ANTHROPIC 顶层字段的逻辑不变（第 105-110 行）
- 将 merged 写入 `newSettings.env` 而非顶层 `Object.assign`
- 回填逻辑（第 93 行）同步改为从 `existing.env?.[key]` 读取

### 3. JSON 格式校验函数

新增工具函数 `validateAndWriteJSON(filePath, data)`：
1. 将内存对象 `JSON.stringify(data, null, 2)`
2. 立即 `JSON.parse` 验证可逆解析
3. 校验通过后才 `writeFileSync` 写入磁盘
4. 校验失败则输出错误并拒绝写入

该函数应用于 `activateConfig()` 和 `writeConfigs()` 两个写入点。

## Risks / Trade-offs

- **settings.json 中 env 字段缺失**：如果用户的 settings.json 没有 `env` 字段（Claude Code 从未配置过环境变量），`readClaudeSettings()` 会返回空对象，后续 `activateConfig()` 会创建 `env` 字段并写入。这是期望行为。
- **env 中可能存在非 ANTHROPIC 键**：写入时 `merged` 对象仅包含 7 个 ANTHROPIC_* 键，会覆盖整个 `env` 字段。改为从 `existing.env` 复制非 ANTHROPIC 键后合并，确保不丢失其他 env 配置。
