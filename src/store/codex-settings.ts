import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parse as parseTOML, stringify as stringifyTOML } from "smol-toml";
import type { CodexConfig } from "../types";
import { readConfigs } from "./config";
import { validateAndWriteJSON } from "./json-validate";
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

// Only map top-level TOML keys (BASE_URL goes into [model_providers] section)
const TOML_TOP_KEYS: Partial<Record<keyof CodexConfig, string>> = {
  CODEX_MODEL: "model",
  CODEX_MODEL_PROVIDER: "model_provider",
  CODEX_REVIEW_MODEL: "review_model",
  CODEX_REASONING_EFFORT: "model_reasoning_effort",
  CODEX_VERBOSITY: "model_verbosity",
};

function resolveProviderName(config: CodexConfig, configName: string): string {
  return config.CODEX_MODEL_PROVIDER || configName;
}

export function getCodexConfigPath(): string {
  return join(homedir(), ".codex", "config.toml");
}

export function getCodexAuthPath(): string {
  return join(homedir(), ".codex", "auth.json");
}

function getCodexDir(): string {
  return join(homedir(), ".codex");
}

export function readCodexConfigTOML(): Partial<CodexConfig> {
  const filePath = getCodexConfigPath();
  if (!existsSync(filePath)) return {};

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = parseTOML(raw) as Record<string, unknown>;
    const result: Partial<CodexConfig> = {};

    // Read top-level keys
    for (const [internal, tomlKey] of Object.entries(TOML_TOP_KEYS)) {
      if (tomlKey && typeof data[tomlKey] === "string" && (data[tomlKey] as string).length > 0) {
        result[internal as keyof CodexConfig] = data[tomlKey] as string;
      }
    }

    // Read model_context_window as integer
    if (typeof data.model_context_window === "number") {
      result.CODEX_CONTEXT_WINDOW = String(data.model_context_window);
    }

    // Read BASE_URL from active provider section
    const modelProvider = result.CODEX_MODEL_PROVIDER
      || (typeof data.model_provider === "string" ? data.model_provider : "");
    if (modelProvider) {
      const providers = data.model_providers as Record<string, Record<string, unknown>> | undefined;
      const section = providers?.[modelProvider];
      if (section && typeof section.base_url === "string" && section.base_url.length > 0) {
        result.BASE_URL = section.base_url;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function readCodexAuthJSON(): { apiKey: string } {
  const filePath = getCodexAuthPath();
  if (!existsSync(filePath)) return { apiKey: "" };

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return { apiKey: typeof data.api_key === "string" ? data.api_key : "" };
  } catch {
    return { apiKey: "" };
  }
}

export async function handleMissingCodexFiles(): Promise<boolean> {
  const dir = getCodexDir();

  if (existsSync(dir)) {
    return true;
  }

  console.log(chalk.yellow("~/.codex/ 目录不存在"));
  const { confirm } = await prompts({
    type: "confirm",
    name: "confirm",
    message: "是否需要自动创建 ~/.codex/ 目录？",
    initial: true,
  });

  if (!confirm) {
    console.log(chalk.yellow("请手动创建 ~/.codex/ 目录后重试"));
    return false;
  }

  mkdirSync(dir, { recursive: true });
  console.log(chalk.green(`已创建 ${dir}`));
  return true;
}

const FIELD_LABELS: Record<string, string> = {
  BASE_URL: "Base URL",
  OPENAI_API_KEY: "API Key",
  CODEX_MODEL: "Model",
  CODEX_MODEL_PROVIDER: "Model Provider",
  CODEX_REVIEW_MODEL: "Review Model",
  CODEX_REASONING_EFFORT: "Reasoning Effort",
  CODEX_VERBOSITY: "Verbosity",
  CODEX_CONTEXT_WINDOW: "Context Window",
};

function maskValue(key: string, value: string): string {
  if (key === "OPENAI_API_KEY") {
    if (value.length <= 12) return value.substring(0, 4) + "****";
    return value.substring(0, 8) + "..." + value.substring(value.length - 4);
  }
  if (value.length > 60) return value.substring(0, 60) + "...";
  return value;
}

async function promptKeepOrRemove(key: string, currentValue: string): Promise<boolean> {
  const label = FIELD_LABELS[key] || key;
  console.log("");
  const { action } = await prompts({
    type: "select",
    name: "action",
    message: `${label} 在目标配置中为空，当前值: ${maskValue(key, currentValue)}`,
    choices: [
      { title: "保留当前值", value: "keep" },
      { title: "移除此配置项", value: "remove" },
    ],
  });
  if (action === undefined) {
    throw new Error("CANCELLED");
  }
  return action === "keep";
}

export async function activateCodexConfig(name: string, config: CodexConfig): Promise<boolean> {
  try {
    return await activateCodexConfigImpl(name, config);
  } catch (e) {
    if (e instanceof Error && e.message === "CANCELLED") {
      console.log(chalk.dim("已取消"));
      return false;
    }
    throw e;
  }
}

async function activateCodexConfigImpl(name: string, config: CodexConfig): Promise<boolean> {
  const configPath = getCodexConfigPath();
  const authPath = getCodexAuthPath();

  // --- Write config.toml ---
  let existingTOML: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      existingTOML = parseTOML(raw) as Record<string, unknown>;
    } catch {
      // overwrite
    }
  }

  const mergedTOML: Record<string, unknown> = { ...existingTOML };

  // Write top-level keys (model, model_provider, review_model, reasoning_effort, verbosity)
  for (const key of CODEX_KEYS) {
    const tomlKey = TOML_TOP_KEYS[key];
    if (!tomlKey) continue; // BASE_URL and OPENAI_API_KEY handled separately

    const newValue = config[key];
    if (newValue && newValue.length > 0) {
      mergedTOML[tomlKey] = newValue;
    } else {
      const existingValue = existingTOML[tomlKey];
      if (typeof existingValue === "string" && existingValue.length > 0) {
        const keep = await promptKeepOrRemove(key, existingValue);
        if (keep) {
          mergedTOML[tomlKey] = existingValue;
        } else {
          delete mergedTOML[tomlKey];
        }
      } else {
        delete mergedTOML[tomlKey];
        console.log(chalk.dim(`${key} 未设置且当前无值，跳过`));
      }
    }
  }

  // Write CODEX_CONTEXT_WINDOW as integer
  const ctxWindow = config.CODEX_CONTEXT_WINDOW;
  if (ctxWindow && ctxWindow.length > 0) {
    const num = parseInt(ctxWindow, 10);
    if (!isNaN(num)) {
      mergedTOML.model_context_window = num;
    }
  } else if (typeof existingTOML.model_context_window !== "undefined") {
    const existingValue = String(existingTOML.model_context_window);
    const keep = await promptKeepOrRemove("CODEX_CONTEXT_WINDOW", existingValue);
    if (keep) {
      // existing value already in mergedTOML from spread, no-op
    } else {
      delete mergedTOML.model_context_window;
    }
  }

  // Write BASE_URL as custom provider section
  const providerName = resolveProviderName(config, name);
  if (config.BASE_URL && config.BASE_URL.length > 0) {
    mergedTOML.model_provider = providerName;

    const existingProviders = (existingTOML.model_providers as Record<string, Record<string, unknown>>) ?? {};
    const mergedProviders: Record<string, Record<string, unknown>> = { ...existingProviders };

    mergedProviders[providerName] = {
      ...mergedProviders[providerName],
      name: providerName,
      base_url: config.BASE_URL,
    };

    mergedTOML.model_providers = mergedProviders;
  } else {
    const existingValue = existingTOML.model_provider;
    if (typeof existingValue === "string" && existingValue.length > 0) {
      const keep = await promptKeepOrRemove("BASE_URL", `model_provider: ${existingValue}`);
      if (keep) {
        // existing model_provider already in mergedTOML, no-op
      } else {
        delete mergedTOML.model_provider;
        delete mergedTOML.model_providers;
      }
    }
  }

  try {
    const tomlStr = stringifyTOML(mergedTOML);
    writeFileSync(configPath, tomlStr + "\n", "utf-8");
  } catch (e) {
    console.error(chalk.red(`写入 config.toml 失败: ${e}`));
    return false;
  }

  // --- Write auth.json ---
  const apiKey = config.OPENAI_API_KEY;
  if (apiKey && apiKey.length > 0) {
    let existingAuth: Record<string, unknown> = {};
    if (existsSync(authPath)) {
      try {
        const raw = readFileSync(authPath, "utf-8");
        existingAuth = JSON.parse(raw);
      } catch {
        // overwrite
      }
    }

    existingAuth.api_key = apiKey;
    validateAndWriteJSON(authPath, existingAuth);
  } else {
    const existingAuth = readCodexAuthJSON();
    if (existingAuth.apiKey && existingAuth.apiKey.length > 0) {
      const keep = await promptKeepOrRemove("OPENAI_API_KEY", existingAuth.apiKey);
      if (!keep) {
        const authToWrite: Record<string, unknown> = {};
        if (existsSync(authPath)) {
          try {
            Object.assign(authToWrite, JSON.parse(readFileSync(authPath, "utf-8")));
          } catch { /* overwrite */ }
        }
        authToWrite.api_key = "";
        validateAndWriteJSON(authPath, authToWrite);
      }
    } else {
      console.log(chalk.dim("OPENAI_API_KEY 未设置，跳过 auth.json 写入"));
    }
  }

  console.log(chalk.green(`已激活配置 "${name}"`));
  return true;
}

export function removeCodexProvider(providerName: string): void {
  const configPath = getCodexConfigPath();
  if (!existsSync(configPath)) return;

  let toml: Record<string, unknown>;
  try {
    toml = parseTOML(readFileSync(configPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return;
  }

  const providers = toml.model_providers as Record<string, unknown> | undefined;
  if (providers && providers[providerName]) {
    delete providers[providerName];
    if (Object.keys(providers).length === 0) {
      delete toml.model_providers;
    }
  }

  if (toml.model_provider === providerName) {
    delete toml.model_provider;
  }

  writeFileSync(configPath, stringifyTOML(toml) + "\n", "utf-8");
}

export function matchCurrentCodexConfig(): { name: string | null; config: Partial<CodexConfig> } {
  const tomlSettings = readCodexConfigTOML();
  const auth = readCodexAuthJSON();

  const currentSettings: Partial<CodexConfig> = { ...tomlSettings };
  if (auth.apiKey) {
    currentSettings.OPENAI_API_KEY = auth.apiKey;
  }

  const settings = currentSettings as Record<string, string>;
  const currentKeys = Object.keys(currentSettings).filter(
    k => settings[k] && settings[k]!.length > 0
  ) as (keyof CodexConfig)[];

  if (currentKeys.length === 0) {
    return { name: null, config: currentSettings };
  }

  const savedModels = readConfigs<CodexConfig>("codex");

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
