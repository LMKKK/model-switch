# config-store

## Requirements

### Requirement: 数据模型定义

系统 SHALL 定义 ModelConfig 类型，包含以下 7 个字段：

| 字段名 | 类型 | 是否必填 |
|--------|------|----------|
| ANTHROPIC_BASE_URL | string | 是 |
| ANTHROPIC_AUTH_TOKEN | string | 是 |
| ANTHROPIC_MODEL | string | 否 |
| ANTHROPIC_REASONING_MODEL | string | 否 |
| ANTHROPIC_DEFAULT_OPUS_MODEL | string | 否 |
| ANTHROPIC_DEFAULT_HAIKU_MODEL | string | 否 |
| ANTHROPIC_DEFAULT_SONNET_MODEL | string | 否 |

#### Scenario: 类型定义校验

- **WHEN** TypeScript 编译时
- **THEN** ModelConfig 类型确保所有字段为 string 类型

### Requirement: 配置文件路径

系统 SHALL 使用 `~/.model-switch/configs/claude/settings.json` 作为配置存储路径。

#### Scenario: 跨平台路径解析

- **WHEN** 在 macOS / Linux / Windows 上运行
- **THEN** 系统正确解析 `~` 为用户主目录，拼接完整路径

### Requirement: 配置文件结构

配置文件 SHALL 使用 JSON 格式，结构为：

```json
{
  "models": {
    "<config-name>": {
      "ANTHROPIC_BASE_URL": "...",
      "ANTHROPIC_AUTH_TOKEN": "...",
      "ANTHROPIC_MODEL": "...",
      "ANTHROPIC_REASONING_MODEL": "...",
      "ANTHROPIC_DEFAULT_OPUS_MODEL": "...",
      "ANTHROPIC_DEFAULT_HAIKU_MODEL": "...",
      "ANTHROPIC_DEFAULT_SONNET_MODEL": "..."
    }
  }
}
```

#### Scenario: 格式校验

- **WHEN** 读取配置文件
- **THEN** 根对象包含 `models` key，其值为对象；每个 model value 为包含上述 7 个字段的对象
