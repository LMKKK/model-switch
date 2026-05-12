# cli-core

## Requirements

### Requirement: 命令入口与子命令路由

系统 SHALL 以 `ms` 为根命令，通过 `claude` 子命令组暴露 list、add、remove、update、use、current 六个子命令。

#### Scenario: 正确路由到子命令

- **WHEN** 用户执行 `ms claude list`
- **THEN** 系统调用 list 处理函数，列出所有已保存的配置

#### Scenario: 未知命令提示

- **WHEN** 用户执行 `ms claude unknown`
- **THEN** 系统输出错误提示并显示可用命令列表

#### Scenario: 帮助信息显示

- **WHEN** 用户执行 `ms claude --help`
- **THEN** 系统显示 claude 子命令组的帮助信息，包含 list、add、remove、update、use、current 的使用说明

### Requirement: list 命令

`ms claude list` SHALL 读取 `~/.model-switch/configs/claude/settings.json` 中的所有配置，以格式化列表输出配置名称及摘要信息。

#### Scenario: 列出已有配置

- **WHEN** 配置文件存在且包含至少一个模型配置
- **THEN** 系统以格式化列表输出每个配置的名称、BASE_URL 和 MODEL 摘要，当前激活的配置高亮标记

#### Scenario: 配置文件不存在时提示

- **WHEN** `~/.model-switch/configs/claude/settings.json` 文件或目录不存在
- **THEN** 系统输出"暂无保存的配置"提示信息

### Requirement: add 命令

`ms claude add` SHALL 以交互方式引导用户依次输入 7 项配置值，保存为新配置。

#### Scenario: 成功新增配置

- **WHEN** 用户执行 `ms claude add`，依次输入配置名称和各项值
- **THEN** 系统将配置保存到 `~/.model-switch/configs/claude/settings.json` 的 `models` 对象中

#### Scenario: 配置名重复

- **WHEN** 用户输入的配置名称已存在
- **THEN** 系统提示名称已存在，询问是否覆盖

#### Scenario: 必填字段校验

- **WHEN** 用户未填写 ANTHROPIC_BASE_URL 或 ANTHROPIC_AUTH_TOKEN
- **THEN** 系统提示该字段为必填，重新要求输入

### Requirement: remove 命令

`ms claude remove` SHALL 列出已有配置供用户选择删除。

#### Scenario: 成功删除配置

- **WHEN** 用户选择要删除的配置名称并确认
- **THEN** 系统从 `models` 对象中移除该配置并保存

#### Scenario: 删除唯一配置

- **WHEN** 用户删除仅剩的最后一个配置
- **THEN** 系统正常删除，`models` 对象变为空

### Requirement: update 命令

`ms claude update <config-name>` SHALL 以交互方式逐项显示已有配置的 7 项值，允许用户修改并保存。

#### Scenario: 成功更新配置

- **WHEN** 用户执行 `ms claude update my-config` 且该配置存在
- **THEN** 系统逐项显示每个字段的当前值，用户回车保留原值或输入新值覆盖，全部确认后保存

#### Scenario: 配置不存在时报错

- **WHEN** 用户执行 `ms claude update non-exist` 且该配置不存在
- **THEN** 系统输出错误提示并列出可用配置名称

### Requirement: use 命令

`ms claude use <config-name>` SHALL 将指定配置的 7 项值写入 `~/.claude/settings.json`，保留其他已有字段不变。

#### Scenario: 成功激活配置

- **WHEN** 用户执行 `ms claude use my-config` 且该配置存在
- **THEN** 系统将 7 项设置合并写入 `~/.claude/settings.json`，保留 settings.json 中的其他字段

#### Scenario: 配置不存在时报错

- **WHEN** 用户执行 `ms claude use non-exist` 且该配置不存在
- **THEN** 系统输出错误提示并列出可用配置名称

#### Scenario: settings.json 不存在时交互创建

- **WHEN** `~/.claude/settings.json` 文件不存在
- **THEN** 系统提示"settings.json 不存在，是否需要自动创建？"
- **AND** 用户同意后，自动创建 `~/.claude/` 目录和 `settings.json` 文件，写入选中配置
- **AND** 用户拒绝后，流程停止，输出"请手动创建 ~/.claude/settings.json 文件后重试"

#### Scenario: 配置值为空时回填

- **WHEN** 选中配置的某个字段值为空字符串
- **THEN** 系统从当前 `~/.claude/settings.json` 读取对应字段的值，提示"<字段名> 未设置，使用当前值: <当前值>"，并将该值写入
- **AND** 若 settings.json 中对应字段也不存在或为空，则跳过该字段不写入

### Requirement: current 命令

`ms claude current` SHALL 将 `~/.claude/settings.json` 中当前的 7 项 ANTHROPIC_* 配置值与已保存的所有配置逐一比对，显示匹配结果。

#### Scenario: 匹配到已保存的配置

- **WHEN** `~/.claude/settings.json` 中 7 项 ANTHROPIC_* 值与某个已保存配置完全一致
- **THEN** 系统输出激活配置名称，并列出所有 7 项当前值

#### Scenario: 未匹配到任何配置

- **WHEN** `~/.claude/settings.json` 中 7 项 ANTHROPIC_* 值与所有已保存配置都不完全匹配
- **THEN** 系统输出"当前配置: unknown（未匹配到已保存配置）"，并列出所有 7 项当前值

#### Scenario: settings.json 不存在

- **WHEN** `~/.claude/settings.json` 文件不存在
- **THEN** 系统输出"未检测到 ~/.claude/settings.json，请先执行 use 命令激活配置"
