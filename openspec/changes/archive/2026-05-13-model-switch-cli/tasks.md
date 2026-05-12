## 1. 项目初始化

- [x] 1.1 初始化 Bun 项目（`bun init`），创建 `package.json` 和 `tsconfig.json`
- [x] 1.2 安装依赖：commander、chalk、prompts（开发依赖：@types/bun、typescript）
- [x] 1.3 创建项目目录结构：`src/`、`src/types/`、`src/store/`、`src/commands/`

## 2. 配置数据模型与存储层（config-store）

- [x] 2.1 定义 `ModelConfig` TypeScript 类型（`src/types/index.ts`）
- [x] 2.2 实现 `getConfigFilePath()` — 解析 `~/.model-switch/configs/claude/settings.json` 路径，跨平台兼容
- [x] 2.3 实现 `readConfigs()` — 读取配置文件，返回 `Record<string, ModelConfig>`；文件不存在或格式错误时返回空对象并给出提示
- [x] 2.4 实现 `writeConfigs(models)` — 将 models 对象写入配置文件，自动递归创建目录

## 3. 配置管理逻辑层（config-manager）

- [x] 3.1 实现 `getClaudeSettingsPath()` — 解析 `~/.claude/settings.json` 路径
- [x] 3.2 实现 `readClaudeSettings()` — 读取 settings.json 中所有 ANTHROPIC_* 字段的前值
- [x] 3.3 实现 `activateConfig(name, config)` — 将 7 项配置合并写入 settings.json，保留其他字段；空值字段从 settings.json 回填并提示用户
- [x] 3.4 实现 `handleMissingSettings()` — settings.json 不存在时交互确认创建；用户拒绝则停止并引导手动创建
- [x] 3.5 实现 `matchCurrentConfig()` — 将 settings.json 当前值逐一比对已保存配置，返回匹配的配置名或 null

## 4. CLI 子命令实现（cli-core）

- [x] 4.1 实现 `ms` 根命令 + `claude` 子命令组注册（`src/index.ts`）
- [x] 4.2 实现 `list` 命令 — 格式化输出所有配置，标记当前激活项
- [x] 4.3 实现 `add` 命令 — 交互式输入 7 项值，校验必填字段，处理重名覆盖
- [x] 4.4 实现 `remove` 命令 — 列出已有配置供选择，确认后删除
- [x] 4.5 实现 `update <config-name>` 命令 — 交互式逐项修改已有配置值
- [x] 4.6 实现 `use <config-name>` 命令 — 激活配置，处理空值回填和 settings.json 缺失场景
- [x] 4.7 实现 `current` 命令 — 显示当前激活配置名称及详情

## 5. 构建与验证

- [x] 5.1 添加 `bun build --compile` 脚本到 `package.json`
- [x] 5.2 构建二进制文件并验证 `ms claude --help` 输出正确
- [x] 5.3 端到端测试：add → list → use → current → update → remove 完整流程
