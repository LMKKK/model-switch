import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ModelConfig } from "../types";
import { readConfigs } from "./config";
import { validateAndWriteJSON } from "./json-validate";
import chalk from "chalk";
import { confirm, select } from "@inquirer/prompts";

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

function maskValue(key: keyof ModelConfig, value: string): string {
  if (key === "ANTHROPIC_AUTH_TOKEN") {
    if (value.length <= 12) return value.substring(0, 4) + "****";
    return value.substring(0, 8) + "..." + value.substring(value.length - 4);
  }
  if (value.length > 60) return value.substring(0, 60) + "...";
  return value;
}

async function promptKeepOrRemove(key: keyof ModelConfig, currentValue: string): Promise<boolean> {
  console.log("");
  let action: string;
  try {
    action = await select({
      message: `${KEY_LABELS[key]} 在目标配置中为空，当前值: ${maskValue(key, currentValue)}`,
      choices: [
        { name: "保留当前值", value: "keep" },
        { name: "移除此配置项", value: "remove" },
      ],
    });
  } catch {
    throw new Error("CANCELLED");
  }
  return action === "keep";
}

export function getClaudeSettingsPath(): string {
  return join(homedir(), ".claude", "settings.json");
}

export function readClaudeSettings(): Partial<ModelConfig> {
  const filePath = getClaudeSettingsPath();

  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    const env = (data as Record<string, unknown>).env as Record<string, unknown> | undefined;
    const result: Partial<ModelConfig> = {};
    for (const key of ANTHROPIC_KEYS) {
      if (env && typeof env[key] === "string" && (env[key] as string).length > 0) {
        result[key] = env[key] as string;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function handleMissingSettings(): Promise<boolean> {
  const filePath = getClaudeSettingsPath();

  if (existsSync(filePath)) {
    return true;
  }

  console.log(chalk.yellow("settings.json 不存在"));
  let confirmed: boolean;
  try {
    confirmed = await confirm({
      message: "是否需要自动创建 ~/.claude/settings.json？",
      default: true,
    });
  } catch {
    console.log(chalk.dim("已取消"));
    return false;
  }

  if (!confirmed) {
    console.log(chalk.yellow("请手动创建 ~/.claude/settings.json 文件后重试"));
    return false;
  }

  const dir = join(homedir(), ".claude");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, "{}\n", "utf-8");
  console.log(chalk.green(`已创建 ${filePath}`));
  return true;
}

export async function activateConfig(name: string, config: ModelConfig): Promise<boolean> {
  try {
    return await activateConfigImpl(name, config);
  } catch (e) {
    if (e instanceof Error && e.message === "CANCELLED") {
      console.log(chalk.dim("已取消"));
      return false;
    }
    throw e;
  }
}

async function activateConfigImpl(name: string, config: ModelConfig): Promise<boolean> {
  const filePath = getClaudeSettingsPath();

  // Read existing settings
  let existing: Record<string, unknown> = {};
  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      // will overwrite with new content
    }
  }

  // Merge config, handling empty values
  const merged = { ...config };
  const existingEnv = (existing.env as Record<string, unknown>) ?? {};
  for (const key of ANTHROPIC_KEYS) {
    if (!merged[key] || merged[key].length === 0) {
      const existingValue = existingEnv[key];
      if (typeof existingValue === "string" && existingValue.length > 0) {
        const keep = await promptKeepOrRemove(key, existingValue);
        if (keep) {
          merged[key] = existingValue;
        } else {
          delete (merged as Record<string, string | undefined>)[key];
        }
      } else {
        delete (merged as Record<string, string | undefined>)[key];
        console.log(chalk.dim(`${key} 未设置且当前无值，跳过`));
      }
    }
  }

  // Preserve non-ANTHROPIC top-level fields
  const newSettings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existing)) {
    if (!ANTHROPIC_KEYS.includes(key as keyof ModelConfig)) {
      newSettings[key] = value;
    }
  }

  // Build env field: preserve non-ANTHROPIC keys, add ANTHROPIC keys
  const env: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existingEnv)) {
    if (!ANTHROPIC_KEYS.includes(key as keyof ModelConfig)) {
      env[key] = value;
    }
  }
  Object.assign(env, merged);
  newSettings.env = env;

  validateAndWriteJSON(filePath, newSettings);

  console.log(chalk.green(`已激活配置 "${name}"`));
  return true;
}

export function matchCurrentConfig(): { name: string | null; config: Partial<ModelConfig> } {
  const currentSettings = readClaudeSettings();
  const savedModels = readConfigs<ModelConfig>("claude");

  // Build comparison subset: only compare keys present in currentSettings
  const settings = currentSettings as Record<string, string>;
  const currentKeys = Object.keys(currentSettings).filter(
    k => settings[k] && settings[k]!.length > 0
  ) as (keyof ModelConfig)[];

  if (currentKeys.length === 0) {
    return { name: null, config: currentSettings };
  }

  for (const [modelName, modelConfig] of Object.entries(savedModels)) {
    let match = true;
    for (const key of currentKeys) {
      if (modelConfig[key] !== currentSettings[key]) {
        match = false;
        break;
      }
    }
    if (match) {
      return { name: modelName, config: currentSettings };
    }
  }

  return { name: null, config: currentSettings };
}
