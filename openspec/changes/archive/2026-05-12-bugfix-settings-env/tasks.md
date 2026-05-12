## 1. JSON 格式校验工具

- [x] 1.1 在 `src/store/` 下新建 `json-validate.ts`，实现 `validateAndWriteJSON(filePath, data)` 函数：先 `JSON.stringify` → `JSON.parse` 校验通过后，才 `writeFileSync` 写入磁盘

## 2. 修复读写路径 (claude-settings.ts)

- [x] 2.1 修改 `readClaudeSettings()`：将 `data[key]` 改为 `data.env?.[key]`
- [x] 2.2 修改 `activateConfig()` 回填逻辑：将 `existing[key]` 改为 `existing.env?.[key]`
- [x] 2.3 修改 `activateConfig()` 写入逻辑：将 ANTHROPIC 键写入 `newSettings.env` 而非顶层，同时保留 `env` 中已有的非 ANTHROPIC 键
- [x] 2.4 将 `activateConfig()` 中的 `writeFileSync` 替换为 `validateAndWriteJSON`

## 3. 增加 JSON 校验 (config.ts)

- [x] 3.1 将 `writeConfigs()` 中的 `writeFileSync` 替换为 `validateAndWriteJSON`

## 4. 验证

- [x] 4.1 执行 `bun run build` 确保编译通过
- [x] 4.2 手动测试：执行 `model-switch use <config>`，确认 `~/.claude/settings.json` 的 `env` 字段正确写入，顶层无 ANTHROPIC_* 键，其他字段不变
