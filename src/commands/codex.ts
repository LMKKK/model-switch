import type { CodexConfig } from "../types";
import { readConfigs, readStore, writeStore } from "../store/config";
import {
  activateCodexConfig,
  handleMissingCodexFiles,
  matchCurrentCodexConfig,
  readCodexConfigTOML,
  readCodexAuthJSON,
  removeCodexProvider,
} from "../store/codex-settings";
import { computeDiffKeys, printDiffSection } from "./_shared";
import chalk from "chalk";
import { input, confirm, select } from "@inquirer/prompts";
import { prefillInput } from "../utils/prompt";

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

function formatCodexValue(key: keyof CodexConfig, value: string): string {
  if (key === "OPENAI_API_KEY") return maskApiKey(value);
  return value;
}

// ---- list ----
export async function listCommand(): Promise<void> {
  const { models, meta } = readStore<CodexConfig>("codex");
  const current = matchCurrentCodexConfig();
  const names = Object.keys(models).sort((a, b) => {
    const ta = meta[a]?.addedAt ?? "";
    const tb = meta[b]?.addedAt ?? "";
    return ta.localeCompare(tb);
  });

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
  const { models, meta } = readStore<CodexConfig>("codex");

  let name: string;
  try {
    name = await input({
      message: "配置名称",
      required: true,
    });
  } catch {
    console.log(chalk.dim("已取消"));
    return;
  }

  if (models[name]) {
    let overwrite: boolean;
    try {
      overwrite = await confirm({
        message: `配置 "${name}" 已存在，是否覆盖？`,
        default: false,
      });
    } catch {
      console.log(chalk.dim("已取消"));
      return;
    }
    if (!overwrite) {
      console.log(chalk.dim("已取消"));
      return;
    }
  }

  const config = {} as CodexConfig;

  for (const key of CODEX_KEYS) {
    if (key === "CODEX_MODEL_PROVIDER") continue;

    const isRequired = REQUIRED_KEYS.includes(key);
    let value: string;
    try {
      value = await input({
        message: `${KEY_LABELS[key]}${isRequired ? "（必填）" : "（可选，回车跳过）"}`,
        validate: (v: string) => {
          if (isRequired && v.trim().length === 0) {
            return "该字段为必填项";
          }
          return true;
        },
      });
    } catch {
      return;
    }
    config[key] = value.trim();
  }

  config.CODEX_MODEL_PROVIDER = name;

  models[name] = config;
  const now = new Date().toISOString();
  const existing = meta[name];
  meta[name] = {
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };
  writeStore<CodexConfig>("codex", { models, meta });
  console.log(chalk.green(`\n已保存配置 "${name}"`));
}

// ---- remove ----
export async function removeCommand(): Promise<void> {
  const { models, meta } = readStore<CodexConfig>("codex");
  const names = Object.keys(models);

  if (names.length === 0) {
    console.log(chalk.yellow("暂无保存的配置，无法删除"));
    return;
  }

  const choices = names.map(n => ({ name: n, value: n }));
  let target: string;
  try {
    target = await select({
      message: "选择要删除的配置",
      choices,
    });
  } catch {
    console.log(chalk.dim("已取消"));
    return;
  }

  let confirmed: boolean;
  try {
    confirmed = await confirm({
      message: `确认删除配置 "${target}"？`,
      default: false,
    });
  } catch {
    console.log(chalk.dim("已取消"));
    return;
  }
  if (!confirmed) {
    console.log(chalk.dim("已取消"));
    return;
  }

  delete models[target];
  delete meta[target];
  writeStore<CodexConfig>("codex", { models, meta });
  removeCodexProvider(target);
  console.log(chalk.green(`已删除配置 "${target}"`));
}

// ---- update ----
export async function updateCommand(configName: string): Promise<void> {
  const { models, meta } = readStore<CodexConfig>("codex");

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
  console.log(chalk.bold(`\n更新配置 "${configName}":`));
  console.log(chalk.cyan("当前值已填充到输入框，可直接编辑或清空\n"));

  for (const key of CODEX_KEYS) {
    const currentValue = config[key] || "";
    let value: string;
    try {
      value = await prefillInput({
        message: `${KEY_LABELS[key]}`,
        initial: currentValue,
      });
    } catch {
      return;
    }
    config[key] = value.trim();
  }

  // Diff & confirm
  const oldConfig = models[configName]!;
  const diffKeys = computeDiffKeys<keyof CodexConfig>(CODEX_KEYS, oldConfig as Partial<Record<keyof CodexConfig, string>>, config);

  if (diffKeys.size === 0) {
    console.log(chalk.dim("\n配置未发生变更"));
    return;
  }

  console.log(chalk.bold("\n变更预览:\n"));

  console.log(chalk.dim("  修改前:"));
  printDiffSection<keyof CodexConfig>(
    oldConfig as Partial<Record<keyof CodexConfig, string>>,
    CODEX_KEYS,
    KEY_LABELS,
    diffKeys,
    formatCodexValue,
  );

  console.log(chalk.green("  修改后:"));
  printDiffSection<keyof CodexConfig>(
    config,
    CODEX_KEYS,
    KEY_LABELS,
    diffKeys,
    formatCodexValue,
  );

  let confirmed: boolean;
  try {
    confirmed = await confirm({
      message: "确认保存以上变更？",
      default: true,
    });
  } catch {
    console.log(chalk.dim("已取消"));
    return;
  }
  if (!confirmed) {
    console.log(chalk.dim("已取消"));
    return;
  }

  models[configName] = config;
  const now = new Date().toISOString();
  const existing = meta[configName];
  meta[configName] = {
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };
  writeStore<CodexConfig>("codex", { models, meta });
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
function fuzzyMatchCodex(
  active: Partial<Record<keyof CodexConfig, string>>,
  saved: Record<string, CodexConfig>,
): string | null {
  const url = active.BASE_URL;
  const key = active.OPENAI_API_KEY;
  if (!url || !key) return null;

  const candidates = Object.entries(saved).filter(
    ([, cfg]) => cfg.BASE_URL === url && cfg.OPENAI_API_KEY === key,
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]![0];

  const scored = candidates.map(([name, cfg]) => {
    let score = 0;
    for (const k of CODEX_KEYS) {
      if (cfg[k] === active[k]) {
        score++;
      }
    }
    return { name, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0]!.score;
  const tied = scored.filter(s => s.score === top);
  return tied.length === 1 ? tied[0]!.name : null;
}

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
  const activeValues = current.config as Partial<Record<keyof CodexConfig, string>>;
  const savedConfigs = readConfigs<CodexConfig>("codex");

  let resolvedName: string | null = current.name;
  let isFuzzy = false;
  if (!resolvedName) {
    resolvedName = fuzzyMatchCodex(activeValues, savedConfigs);
    isFuzzy = resolvedName !== null;
  }

  console.log();
  if (resolvedName) {
    const saved = savedConfigs[resolvedName] as Partial<Record<keyof CodexConfig, string>> | undefined;

    if (isFuzzy) {
      console.log(chalk.green.bold(`当前激活配置: ${resolvedName}`) + chalk.dim(" (按 BASE_URL + OPENAI_API_KEY 指纹识别，字段有差异)"));
    } else {
      console.log(chalk.green.bold(`当前激活配置: ${resolvedName}`));
    }
    console.log();

    const diffKeys = saved
      ? computeDiffKeys<keyof CodexConfig>(CODEX_KEYS, saved, activeValues)
      : new Set<keyof CodexConfig>();

    if (saved) {
      printDiffSection<keyof CodexConfig>(
        saved,
        CODEX_KEYS,
        KEY_LABELS,
        diffKeys,
        formatCodexValue,
      );
    } else {
      console.log(chalk.yellow("仓库保存版本已不存在(可能被删除)"));
      console.log();
    }

    console.log(chalk.green.bold("目标文件实际生效值(~/.codex/config.toml + ~/.codex/auth.json)"));
    printDiffSection<keyof CodexConfig>(
      activeValues,
      CODEX_KEYS,
      KEY_LABELS,
      diffKeys,
      formatCodexValue,
    );
  } else {
    console.log(chalk.yellow("当前配置: unknown（未匹配到已保存配置）"));
    console.log();
    console.log(chalk.green.bold("目标文件实际生效值(~/.codex/config.toml + ~/.codex/auth.json)"));
    printDiffSection<keyof CodexConfig>(
      activeValues,
      CODEX_KEYS,
      KEY_LABELS,
      new Set<keyof CodexConfig>(),
      formatCodexValue,
    );
  }
}
