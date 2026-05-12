import type { ModelConfig } from "../types";
import { readConfigs, writeConfigs } from "../store/config";
import {
  activateConfig,
  handleMissingSettings,
  matchCurrentConfig,
  readClaudeSettings,
} from "../store/claude-settings";
import chalk from "chalk";
import prompts from "prompts";

const ANTHROPIC_KEYS: (keyof ModelConfig)[] = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_REASONING_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
];

const KEY_LABELS: Record<keyof ModelConfig, string> = {
  ANTHROPIC_BASE_URL: "Base URL",
  ANTHROPIC_AUTH_TOKEN: "Auth Token",
  ANTHROPIC_MODEL: "Model",
  ANTHROPIC_REASONING_MODEL: "Reasoning Model",
  ANTHROPIC_DEFAULT_OPUS_MODEL: "Default Opus Model",
  ANTHROPIC_DEFAULT_HAIKU_MODEL: "Default Haiku Model",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "Default Sonnet Model",
};

const OPTIONAL_KEYS: (keyof ModelConfig)[] = [
  "ANTHROPIC_MODEL",
  "ANTHROPIC_REASONING_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
];

const REQUIRED_KEYS: (keyof ModelConfig)[] = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
];

// ---- list ----
export async function listCommand(): Promise<void> {
  const models = readConfigs();
  const current = matchCurrentConfig();
  const names = Object.keys(models);

  if (names.length === 0) {
    console.log(chalk.yellow("暂无保存的配置"));
    return;
  }

  console.log(chalk.bold("\n已保存的配置:\n"));
  for (const name of names) {
    const config = models[name]!;
    const isActive = current.name === name;
    const prefix = isActive ? chalk.green("  ●") : "   ";
    const displayName = isActive ? chalk.green.bold(name) : chalk.white(name);
    console.log(`${prefix} ${displayName}`);
    console.log(chalk.dim(`     URL: ${config.ANTHROPIC_BASE_URL}`));
    console.log(chalk.dim(`     Model: ${config.ANTHROPIC_MODEL || "(未设置)"}`));
    console.log();
  }
}

// ---- add ----
export async function addCommand(): Promise<void> {
  const models = readConfigs();

  // Config name
  const { name } = await prompts({
    type: "text",
    name: "name",
    message: "配置名称",
    validate: (v: string) => (v.trim().length > 0 ? true : "配置名称不能为空"),
  });
  if (!name) {
    console.log(chalk.dim("已取消"));
    return;
  }

  // Check duplicate
  if (models[name]) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `配置 "${name}" 已存在，是否覆盖？`,
      initial: false,
    });
    if (!overwrite) {
      console.log(chalk.dim("已取消"));
      return;
    }
  }

  const config = {} as ModelConfig;

  for (const key of ANTHROPIC_KEYS) {
    const isRequired = REQUIRED_KEYS.includes(key);
    const { value } = await prompts({
      type: isRequired ? "text" : "text",
      name: "value",
      message: `${KEY_LABELS[key]}${isRequired ? "（必填）" : "（可选，回车跳过）"}`,
      validate: (v: string) => {
        if (isRequired && v.trim().length === 0) {
          return "该字段为必填项";
        }
        return true;
      },
    });

    if (value === undefined) {
      // User cancelled (Ctrl+C)
      return;
    }

    config[key] = value.trim();
  }

  models[name] = config;
  writeConfigs(models);
  console.log(chalk.green(`\n已保存配置 "${name}"`));
}

// ---- remove ----
export async function removeCommand(): Promise<void> {
  const models = readConfigs();
  const names = Object.keys(models);

  if (names.length === 0) {
    console.log(chalk.yellow("暂无保存的配置，无法删除"));
    return;
  }

  const choices = names.map(n => ({ title: n, value: n }));
  const { target } = await prompts({
    type: "select",
    name: "target",
    message: "选择要删除的配置",
    choices,
  });
  if (!target) {
    console.log(chalk.dim("已取消"));
    return;
  }

  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: `确认删除配置 "${target}"？`,
    initial: false,
  });
  if (!confirm) {
    console.log(chalk.dim("已取消"));
    return;
  }

  delete models[target];
  writeConfigs(models);
  console.log(chalk.green(`已删除配置 "${target}"`));
}

// ---- update ----
export async function updateCommand(configName: string): Promise<void> {
  const models = readConfigs();

  if (!models[configName]) {
    console.log(chalk.red(`配置 "${configName}" 不存在`));
    const names = Object.keys(models);
    if (names.length > 0) {
      console.log(chalk.dim(`可用配置: ${names.join(", ")}`));
    } else {
      console.log(chalk.dim("当前无任何保存的配置"));
    }
    return;
  }

  const config = { ...models[configName] };
  console.log(chalk.bold(`\n更新配置 "${configName}"（回车保留原值）:\n`));

  for (const key of ANTHROPIC_KEYS) {
    const currentValue = config[key] || "";
    const { value } = await prompts({
      type: "text",
      name: "value",
      message: `${KEY_LABELS[key]} [当前: ${currentValue || "(空)"}]`,
      initial: currentValue,
    });

    if (value === undefined) {
      return; // cancelled
    }

    config[key] = value.trim();
  }

  models[configName] = config;
  writeConfigs(models);
  console.log(chalk.green(`\n已更新配置 "${configName}"`));
}

// ---- use ----
export async function useCommand(configName: string): Promise<void> {
  const models = readConfigs();

  if (!models[configName]) {
    console.log(chalk.red(`配置 "${configName}" 不存在`));
    const names = Object.keys(models);
    if (names.length > 0) {
      console.log(chalk.dim(`可用配置: ${names.join(", ")}`));
    } else {
      console.log(chalk.dim("当前无任何保存的配置"));
    }
    return;
  }

  const config = models[configName]!;

  // Handle missing settings.json
  const ok = await handleMissingSettings();
  if (!ok) return;

  await activateConfig(configName, config);
}

// ---- current ----
export async function currentCommand(): Promise<void> {
  const claudeSettings = readClaudeSettings();
  const settings = claudeSettings as Record<string, string>;
  const keys = Object.keys(claudeSettings).filter(
    k => settings[k] && settings[k]!.length > 0
  );

  if (keys.length === 0) {
    console.log(chalk.yellow("未检测到 ~/.claude/settings.json 中的 ANTHROPIC_* 配置"));
    console.log(chalk.dim("请先执行 use 命令激活配置"));
    return;
  }

  const current = matchCurrentConfig();

  if (current.name) {
    console.log(chalk.green.bold(`\n当前激活配置: ${current.name}\n`));
  } else {
    console.log(chalk.yellow("当前配置: unknown（未匹配到已保存配置）\n"));
  }

  for (const key of ANTHROPIC_KEYS) {
    const value = (current.config as Record<string, string>)[key];
    if (value) {
      const displayValue = key === "ANTHROPIC_AUTH_TOKEN"
        ? value.substring(0, 8) + "..." + value.substring(value.length - 4)
        : value;
      console.log(`  ${chalk.dim(KEY_LABELS[key] + ":")} ${displayValue}`);
    } else {
      console.log(`  ${chalk.dim(KEY_LABELS[key] + ":")} ${chalk.dim("(未设置)")}`);
    }
  }
  console.log();
}
