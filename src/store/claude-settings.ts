import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ModelConfig } from "../types";
import { readConfigs } from "./config";
import { validateAndWriteJSON } from "./json-validate";
import chalk from "chalk";
import prompts from "prompts";

const ANTHROPIC_KEYS: (keyof ModelConfig)[] = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_REASONING_MODEL",
  "ANTHROPIC_DEFAULT_OPUS_MODEL",
  "ANTHROPIC_DEFAULT_SONNET_MODEL",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL",
];

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
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: "是否需要自动创建 ~/.claude/settings.json？",
    initial: true,
  });

  if (!confirm) {
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
      // Try to fill from existing settings
      if (typeof existingEnv[key] === "string" && (existingEnv[key] as string).length > 0) {
        merged[key] = existingEnv[key] as string;
        console.log(chalk.dim(`${key} 未设置，使用当前值: ${(existingEnv[key] as string).substring(0, 40)}...`));
      } else {
        // Don't write empty values
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

  const filledKeys = Object.keys(merged).filter(k => config[k as keyof ModelConfig]?.length > 0);
  if (filledKeys.length < ANTHROPIC_KEYS.length) {
    console.log(chalk.cyan(`已激活配置 "${name}"，其中 ${ANTHROPIC_KEYS.length - filledKeys.length} 项使用回填值或保留原值`));
  } else {
    console.log(chalk.green(`已激活配置 "${name}"`));
  }

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
