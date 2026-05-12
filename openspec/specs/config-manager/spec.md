# config-manager

## Requirements

### Requirement: 配置读取

系统 SHALL 从 `~/.model-switch/configs/claude/settings.json` 读取所有模型配置。

#### Scenario: 读取正常配置文件

- **WHEN** 配置文件存在且格式正确
- **THEN** 返回 `models` 对象中的所有配置键值对

#### Scenario: 配置文件不存在时返回空

- **WHEN** 配置文件或目录不存在
- **THEN** 返回空的 models 对象，不抛出异常

#### Scenario: 配置文件格式错误

- **WHEN** 配置文件内容不是合法 JSON
- **THEN** 输出格式错误提示，返回空的 models 对象

### Requirement: 配置保存

系统 SHALL 将指定配置写入 `~/.model-switch/configs/claude/settings.json` 的 `models` 字段下。

#### Scenario: 新增配置

- **WHEN** 向 models 中添加一个不存在的配置名
- **THEN** 新配置追加到 models 对象中并写入文件

#### Scenario: 覆盖已有配置

- **WHEN** 向 models 中添加一个已存在的配置名
- **THEN** 该配置的值被替换为新值，其他配置不受影响

#### Scenario: 自动创建目录

- **WHEN** `~/.model-switch/configs/claude/` 目录不存在
- **THEN** 系统自动递归创建所需目录

### Requirement: 配置删除

系统 SHALL 从 models 对象中移除指定配置。

#### Scenario: 删除存在的配置

- **WHEN** 指定配置名在 models 中存在
- **THEN** 从 models 对象中移除该 key 并写入文件

#### Scenario: 删除不存在的配置

- **WHEN** 指定配置名在 models 中不存在
- **THEN** 输出提示"配置不存在"，不修改文件

### Requirement: 激活配置

系统 SHALL 读取指定配置的值，将其合并写入 `~/.claude/settings.json`，仅更新 ANTHROPIC_* 开头的 7 个字段，保留其他字段。

#### Scenario: 合并写入 settings.json

- **WHEN** `~/.claude/settings.json` 已存在且包含其他字段（如 enabledPlugins）
- **THEN** 系统仅覆盖 7 个 ANTHROPIC_* 字段，保留 enabledPlugins 等字段不变

#### Scenario: settings.json 不存在时创建

- **WHEN** `~/.claude/settings.json` 不存在
- **THEN** 系统创建文件并写入 7 项配置

#### Scenario: 部分字段为空时跳过

- **WHEN** 配置中某些字段值为空字符串
- **THEN** 该系统不将该空值字段写入 settings.json（避免覆盖有效值）
