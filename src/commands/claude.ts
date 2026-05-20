import type { ModelConfig } from "../types";
import { readConfigs, readStore, writeStore } from "../store/config";
import {
  activateConfig,
  handleMissingSettings,
  matchCurrentConfig,
  readClaudeSettings,
} from "../store/claude-settings";
import { computeDiffKeys, printDiffSection } from "./_shared";
import chalk from "chalk";
import { input, confirm } from "@inquirer/prompts";
import { prefillInput, detailSelect } from "../utils/prompt";

const ANTHROPIC_KEYS: (keyof ModelConfig)[] = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_REASONING_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
];

const KEY_LABELS: Record<keyof ModelConfig, string> = {
  ANTHROPIC_BASE_URL: "Base URL",
  ANTHROPIC_AUTH_TOKEN: "Auth Token",
  ANTHROPIC_MODEL: "Model",
  ANTHROPIC_REASONING_MODEL: "Reasoning Model",
  ANTHROPIC_DEFAULT_OPUS_MODEL: "Default Opus Model",
  ANTHROPIC_DEFAULT_SONNET_MODEL: "Default Sonnet Model",
  ANTHROPIC_DEFAULT_HAIKU_MODEL: "Default Haiku Model",
};

const OPTIONAL_KEYS: (keyof ModelConfig)[] = [
  "ANTHROPIC_MODEL",
  "ANTHROPIC_REASONING_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
];

const REQUIRED_KEYS: (keyof ModelConfig)[] = [
  "ANTHROPIC_BASE_URL",
];

function formatAnthropicValue(key: keyof ModelConfig, value: string): string {
  if (key === "ANTHROPIC_AUTH_TOKEN") {
    if (value.length <= 12) return value.substring(0, 4) + "****";
    return value.substring(0, 8) + "..." + value.substring(value.length - 4);
  }
  return value;
}

// ---- list ----
export async function listCommand(): Promise<void> {
  const { models, meta } = readStore<ModelConfig>("claude");
  const current = matchCurrentConfig();
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
    console.log(chalk.dim(`     URL: ${config.ANTHROPIC_BASE_URL}`));
    console.log(chalk.dim(`     Model: ${config.ANTHROPIC_MODEL || "(未设置)"}`));
    console.log(chalk.dim(`     Reasoning Model: ${config.ANTHROPIC_REASONING_MODEL || "(未设置)"}`));
    console.log(chalk.dim(`     Default Opus Model: ${config.ANTHROPIC_DEFAULT_OPUS_MODEL || "(未设置)"}`));
    console.log(chalk.dim(`     Default Sonnet Model: ${config.ANTHROPIC_DEFAULT_SONNET_MODEL || "(未设置)"}`));
    console.log(chalk.dim(`     Default Haiku Model: ${config.ANTHROPIC_DEFAULT_HAIKU_MODEL || "(未设置)"}`));
    console.log();
  }
}

// ---- add ----
export async function addCommand(): Promise<void> {
  const { models, meta } = readStore<ModelConfig>("claude");

  // Config name
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

  // Check duplicate
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

  const config = {} as ModelConfig;

  for (const key of ANTHROPIC_KEYS) {
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

  models[name] = config;
  const now = new Date().toISOString();
  const existing = meta[name];
  meta[name] = {
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };
  writeStore<ModelConfig>("claude", { models, meta });
  console.log(chalk.green(`\n已保存配置 "${name}"`));
}

// ---- remove ----
export async function removeCommand(): Promise<void> {
  const { models, meta } = readStore<ModelConfig>("claude");
  const names = Object.keys(models);

  if (names.length === 0) {
    console.log(chalk.yellow("暂无保存的配置，无法删除"));
    return;
  }

  const choices = names.map((name) => ({
    name,
    value: name,
    detail: () => {
      const cfg = models[name]!;
      const lines = ANTHROPIC_KEYS.map((key) => {
        const val = cfg[key] || "";
        const display = formatAnthropicValue(key, val) || "(未设置)";
        return `   ${KEY_LABELS[key]}: ${display}`;
      });
      return lines.join("\n");
    },
  }));
  let target: string;
  try {
    target = await detailSelect({
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
  writeStore<ModelConfig>("claude", { models, meta });
  console.log(chalk.green(`已删除配置 "${target}"`));
}

// ---- update ----
export async function updateCommand(configName?: string): Promise<void> {
  const { models, meta } = readStore<ModelConfig>("claude");

  if (!configName) {
    const names = Object.keys(models);
    if (names.length === 0) {
      console.log(chalk.yellow("暂无保存的配置，请先使用 add 命令添加"));
      return;
    }

    const choices = names.map((name) => ({
      name,
      value: name,
      detail: () => {
        const cfg = models[name]!;
        const lines = ANTHROPIC_KEYS.map((key) => {
          const val = cfg[key] || "";
          const display = formatAnthropicValue(key, val) || "(未设置)";
          return `   ${KEY_LABELS[key]}: ${display}`;
        });
        return lines.join("\n");
      },
    }));

    let selected: string;
    try {
      selected = await detailSelect({
        message: "选择要更新的配置",
        choices,
      });
    } catch {
      console.log(chalk.dim("已取消"));
      return;
    }
    configName = selected;
  }

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

  const source = models[configName]!;
  const config = { ...source } as ModelConfig;
  console.log(chalk.bold(`\n更新配置 "${configName}":`));
  console.log(chalk.cyan("当前值已填充到输入框，可直接编辑或清空\n"));

  for (const key of ANTHROPIC_KEYS) {
    const currentValue = source[key] || "";
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
  const diffKeys = computeDiffKeys<keyof ModelConfig>(ANTHROPIC_KEYS, oldConfig as Partial<Record<keyof ModelConfig, string>>, config);

  if (diffKeys.size === 0) {
    console.log(chalk.dim("\n配置未发生变更"));
    return;
  }

  console.log(chalk.bold("\n变更预览:\n"));

  console.log(chalk.dim("  修改前:"));
  printDiffSection<keyof ModelConfig>(
    oldConfig as Partial<Record<keyof ModelConfig, string>>,
    ANTHROPIC_KEYS,
    KEY_LABELS,
    diffKeys,
    formatAnthropicValue,
  );

  console.log(chalk.green("  修改后:"));
  printDiffSection<keyof ModelConfig>(
    config,
    ANTHROPIC_KEYS,
    KEY_LABELS,
    diffKeys,
    formatAnthropicValue,
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
  writeStore<ModelConfig>("claude", { models, meta });
  console.log(chalk.green(`\n已更新配置 "${configName}"`));
}

// ---- use ----
export async function useCommand(configName?: string): Promise<void> {
  const models = readConfigs<ModelConfig>("claude");

  if (!configName) {
    const names = Object.keys(models);
    if (names.length === 0) {
      console.log(chalk.yellow("暂无保存的配置，请先使用 add 命令添加"));
      return;
    }

    const choices = names.map((name) => ({
      name,
      value: name,
      detail: () => {
        const cfg = models[name]!;
        const lines = ANTHROPIC_KEYS.map((key) => {
          const val = cfg[key] || "";
          const display = formatAnthropicValue(key, val) || "(未设置)";
          return `   ${KEY_LABELS[key]}: ${display}`;
        });
        return lines.join("\n");
      },
    }));

    let selected: string;
    try {
      selected = await detailSelect({
        message: "选择要激活的配置",
        choices,
      });
    } catch {
      console.log(chalk.dim("已取消"));
      return;
    }
    configName = selected;
  }

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
function fuzzyMatchByFingerprint(
  active: Partial<Record<keyof ModelConfig, string>>,
  saved: Record<string, ModelConfig>,
): string | null {
  const url = active.ANTHROPIC_BASE_URL;
  const token = active.ANTHROPIC_AUTH_TOKEN;
  if (!url || !token) return null;

  const candidates = Object.entries(saved).filter(
    ([, cfg]) => cfg.ANTHROPIC_BASE_URL === url && cfg.ANTHROPIC_AUTH_TOKEN === token,
  );
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]![0];

  const scored = candidates.map(([name, cfg]) => {
    let score = 0;
    for (const key of ANTHROPIC_KEYS) {
      if (cfg[key] === active[key]) {
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
  const activeValues = current.config as Partial<Record<keyof ModelConfig, string>>;
  const savedConfigs = readConfigs<ModelConfig>("claude");

  let resolvedName: string | null = current.name;
  let isFuzzy = false;
  if (!resolvedName) {
    resolvedName = fuzzyMatchByFingerprint(activeValues, savedConfigs);
    isFuzzy = resolvedName !== null;
  }

  console.log();
  if (resolvedName) {
    const saved = savedConfigs[resolvedName] as Partial<Record<keyof ModelConfig, string>> | undefined;

    if (isFuzzy) {
      console.log(chalk.green.bold(`当前激活配置: ${resolvedName}`) + chalk.dim(" (按 BASE_URL + AUTH_TOKEN 指纹识别，字段有差异)"));
    } else {
      console.log(chalk.green.bold(`当前激活配置: ${resolvedName}`));
    }
    console.log();

    const diffKeys = saved
      ? computeDiffKeys<keyof ModelConfig>(ANTHROPIC_KEYS, saved, activeValues)
      : new Set<keyof ModelConfig>();

    if (saved) {
      printDiffSection<keyof ModelConfig>(
        saved,
        ANTHROPIC_KEYS,
        KEY_LABELS,
        diffKeys,
        formatAnthropicValue,
      );
    } else {
      console.log(chalk.yellow("仓库保存版本已不存在(可能被删除)"));
      console.log();
    }

    console.log(chalk.green.bold("目标文件实际生效值(~/.claude/settings.json)"));
    printDiffSection<keyof ModelConfig>(
      activeValues,
      ANTHROPIC_KEYS,
      KEY_LABELS,
      diffKeys,
      formatAnthropicValue,
    );
  } else {
    console.log(chalk.yellow("当前配置: unknown（未匹配到已保存配置）"));
    console.log();
    console.log(chalk.green.bold("目标文件实际生效值(~/.claude/settings.json)"));
    printDiffSection<keyof ModelConfig>(
      activeValues,
      ANTHROPIC_KEYS,
      KEY_LABELS,
      new Set<keyof ModelConfig>(),
      formatAnthropicValue,
    );
  }
}
