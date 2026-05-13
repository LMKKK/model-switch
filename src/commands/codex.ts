import type { CodexConfig } from "../types";
import { readConfigs, writeConfigs } from "../store/config";
import {
  activateCodexConfig,
  handleMissingCodexFiles,
  matchCurrentCodexConfig,
  readCodexConfigTOML,
  readCodexAuthJSON,
  removeCodexProvider,
} from "../store/codex-settings";
import chalk from "chalk";
import prompts from "prompts";

const CODEX_KEYS: (keyof CodexConfig)[] = [
  "BASE_URL",
  "OPENAI_API_KEY",
  "CODEX_MODEL",
  "CODEX_MODEL_PROVIDER",
  "CODEX_REVIEW_MODEL",
  "CODEX_REASONING_EFFORT",
  "CODEX_VERBOSITY",
  "CODEX_CONTEXT_WINDOW",
];

const KEY_LABELS: Record<keyof CodexConfig, string> = {
  BASE_URL: "Base URL",
  OPENAI_API_KEY: "API Key",
  CODEX_MODEL: "Model",
  CODEX_MODEL_PROVIDER: "Model Provider",
  CODEX_REVIEW_MODEL: "Review Model",
  CODEX_REASONING_EFFORT: "Reasoning Effort",
  CODEX_VERBOSITY: "Verbosity",
  CODEX_CONTEXT_WINDOW: "Context Window",
};

const REQUIRED_KEYS: (keyof CodexConfig)[] = [
  "BASE_URL",
];

const OPTIONAL_KEYS: (keyof CodexConfig)[] = [
  "OPENAI_API_KEY",
  "CODEX_MODEL",
  "CODEX_MODEL_PROVIDER",
  "CODEX_REVIEW_MODEL",
  "CODEX_REASONING_EFFORT",
  "CODEX_VERBOSITY",
  "CODEX_CONTEXT_WINDOW",
];

function maskApiKey(key: string): string {
  if (key.length <= 12) return key.substring(0, 4) + "****";
  return key.substring(0, 8) + "..." + key.substring(key.length - 4);
}

// ---- list ----
export async function listCommand(): Promise<void> {
  const models = readConfigs<CodexConfig>("codex");
  const current = matchCurrentCodexConfig();
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
    console.log(chalk.dim(`     URL: ${config.BASE_URL}`));
    console.log(chalk.dim(`     API Key: ${config.OPENAI_API_KEY ? maskApiKey(config.OPENAI_API_KEY) : "(空)"}`));
    console.log(chalk.dim(`     Model: ${config.CODEX_MODEL || "(未设置)"}`));
    console.log(chalk.dim(`     Model Provider: ${config.CODEX_MODEL_PROVIDER || "(未设置)"}`));
    console.log(chalk.dim(`     Review Model: ${config.CODEX_REVIEW_MODEL || "(未设置)"}`));
    console.log(chalk.dim(`     Reasoning Effort: ${config.CODEX_REASONING_EFFORT || "(未设置)"}`));
    console.log(chalk.dim(`     Verbosity: ${config.CODEX_VERBOSITY || "(未设置)"}`));
    console.log();
  }
}

// ---- add ----
export async function addCommand(): Promise<void> {
  const models = readConfigs<CodexConfig>("codex");

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

  const config = {} as CodexConfig;

  for (const key of CODEX_KEYS) {
    if (key === "CODEX_MODEL_PROVIDER") continue;

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
      return;
    }

    config[key] = value.trim();
  }

  config.CODEX_MODEL_PROVIDER = name;

  models[name] = config;
  writeConfigs("codex", models);
  console.log(chalk.green(`\n已保存配置 "${name}"`));
}

// ---- remove ----
export async function removeCommand(): Promise<void> {
  const models = readConfigs<CodexConfig>("codex");
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
  writeConfigs("codex", models);
  removeCodexProvider(target);
  console.log(chalk.green(`已删除配置 "${target}"`));
}

// ---- update ----
export async function updateCommand(configName: string): Promise<void> {
  const models = readConfigs<CodexConfig>("codex");

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

  for (const key of CODEX_KEYS) {
    const currentValue = config[key] || "";
    const displayValue = key === "OPENAI_API_KEY" && currentValue
      ? maskApiKey(currentValue)
      : currentValue;
    const { value } = await prompts({
      type: "text",
      name: "value",
      message: `${KEY_LABELS[key]} [当前: ${displayValue || "(空)"}]`,
      initial: currentValue,
    });

    if (value === undefined) {
      return;
    }

    config[key] = value.trim();
  }

  models[configName] = config;
  writeConfigs("codex", models);
  console.log(chalk.green(`\n已更新配置 "${configName}"`));
}

// ---- use ----
export async function useCommand(configName: string): Promise<void> {
  const models = readConfigs<CodexConfig>("codex");

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

  const ok = await handleMissingCodexFiles();
  if (!ok) return;

  await activateCodexConfig(configName, config);
}

// ---- current ----
export async function currentCommand(): Promise<void> {
  const tomlSettings = readCodexConfigTOML();
  const auth = readCodexAuthJSON();

  const settings = { ...tomlSettings } as Record<string, string>;
  if (auth.apiKey) {
    settings.OPENAI_API_KEY = auth.apiKey;
  }

  const keys = Object.keys(settings).filter(
    k => settings[k] && settings[k]!.length > 0
  );

  if (keys.length === 0) {
    console.log(chalk.yellow("未检测到 ~/.codex/config.toml 或 ~/.codex/auth.json 中的配置"));
    console.log(chalk.dim("请先执行 use 命令激活配置"));
    return;
  }

  const current = matchCurrentCodexConfig();

  if (current.name) {
    console.log(chalk.green.bold(`\n当前激活配置: ${current.name}\n`));
  } else {
    console.log(chalk.yellow("当前配置: unknown（未匹配到已保存配置）\n"));
  }

  for (const key of CODEX_KEYS) {
    const value = (current.config as Record<string, string>)[key];
    if (value) {
      const displayValue = key === "OPENAI_API_KEY"
        ? maskApiKey(value)
        : value;
      console.log(`  ${chalk.dim(KEY_LABELS[key] + ":")} ${displayValue}`);
    } else {
      console.log(`  ${chalk.dim(KEY_LABELS[key] + ":")} ${chalk.dim("(未设置)")}`);
    }
  }
  console.log();
}
