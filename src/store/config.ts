import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { validateAndWriteJSON } from "./json-validate";
import type { ModelStore, ModelStoreMeta, Provider } from "../types";
import chalk from "chalk";

export function getConfigFilePath(provider: Provider): string {
  return join(homedir(), ".model-switch", "configs", provider, "settings.json");
}

function readRawStore<T>(provider: Provider): { models: Record<string, T>; meta: Record<string, ModelStoreMeta> } {
  const filePath = getConfigFilePath(provider);

  if (!existsSync(filePath)) {
    return { models: {}, meta: {} };
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data: ModelStore<T> = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.models || typeof data.models !== "object") {
      console.warn(chalk.yellow("配置文件格式错误，将视为空配置"));
      return { models: {}, meta: {} };
    }
    const meta = data.meta && typeof data.meta === "object" ? { ...data.meta } : {};
    return { models: data.models, meta };
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.warn(chalk.yellow("配置文件 JSON 格式错误，将视为空配置"));
      return { models: {}, meta: {} };
    }
    throw e;
  }
}

export function readStore<T = unknown>(
  provider: Provider,
): { models: Record<string, T>; meta: Record<string, ModelStoreMeta> } {
  const { models, meta } = readRawStore<T>(provider);

  const modelNames = Object.keys(models);
  const base = Date.now();
  const total = modelNames.length;
  for (let i = 0; i < total; i++) {
    const name = modelNames[i]!;
    if (!meta[name]) {
      const ts = new Date(base - (total - i)).toISOString();
      meta[name] = { addedAt: ts, updatedAt: ts };
    }
  }
  for (const name of Object.keys(meta)) {
    if (!models[name]) {
      delete meta[name];
    }
  }

  return { models, meta };
}

export function writeStore<T = unknown>(
  provider: Provider,
  store: { models: Record<string, T>; meta: Record<string, ModelStoreMeta> },
): void {
  const filePath = getConfigFilePath(provider);
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(chalk.dim(`创建目录: ${dir}`));
  }

  const data: ModelStore<T> = { models: store.models, meta: store.meta };
  validateAndWriteJSON(filePath, data);
}

export function readConfigs<T = unknown>(provider: Provider): Record<string, T> {
  return readStore<T>(provider).models;
}

export function writeConfigs<T = unknown>(provider: Provider, models: Record<string, T>): void {
  const { meta } = readStore<T>(provider);
  writeStore<T>(provider, { models, meta });
}
