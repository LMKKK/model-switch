## MODIFIED Requirements

### Requirement: list 命令

`ms claude list` SHALL 读取 `~/.model-switch/configs/claude/settings.json` 中的所有配置，以格式化列表输出配置名称及摘要信息。

#### Scenario: 列出已有配置

- **WHEN** 配置文件存在且包含至少一个模型配置
- **THEN** 系统以格式化列表输出每个配置的 Name、Base URL、Model、Reasoning Model、Default Opus Model、Default Haiku Model、Default Sonnet Model 摘要，当前激活的配置高亮标记

#### Scenario: 配置文件不存在时提示

- **WHEN** `~/.model-switch/configs/claude/settings.json` 文件或目录不存在
- **THEN** 系统输出"暂无保存的配置"提示信息
