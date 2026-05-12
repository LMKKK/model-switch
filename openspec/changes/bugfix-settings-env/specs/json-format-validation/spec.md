## ADDED Requirements

### Requirement: Validate JSON before writing to file

系统 SHALL 在写入任何 JSON 配置文件到磁盘之前，在内存中完成 JSON 格式校验。

#### Scenario: 写入 ~/.claude/settings.json 前校验通过

- **WHEN** 调用 `activateConfig()` 构建好内存中的 JSON 对象
- **THEN** 系统先执行 `JSON.stringify` 序列化再 `JSON.parse` 反序列化验证格式正确，确认无误后才执行 `writeFileSync`

#### Scenario: 写入 ~/.claude/settings.json 前校验失败

- **WHEN** 内存中的 JSON 对象包含无法序列化的值（如循环引用）
- **THEN** 系统输出错误信息，拒绝写入文件，原文件保持不变

#### Scenario: 写入 ~/.model-switch/configs/claude/settings.json 前校验

- **WHEN** 调用 `writeConfigs()` 构建好 `ModelStore` 对象
- **THEN** 系统先执行 `JSON.stringify` → `JSON.parse` 校验，确认无误后才执行 `writeFileSync`
