import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { validateAndWriteJSON } from "./json-validate";
import type { ModelStore, Provider } from "../types";
import chalk from "chalk";

export function getConfigFilePath(provider: Provider): string {
  return join(homedir(), ".model-switch", "configs", provider, "settings.json");
}

export function readConfigs<T = unknown>(provider: Provider): Record<string, T> {
  const filePath = getConfigFilePath(provider);

  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data: ModelStore<T> = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.models || typeof data.models !== "object") {
      console.warn(chalk.yellow("配置文件格式错误，将视为空配置"));
      return {};
    }
    return data.models;
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.warn(chalk.yellow("配置文件 JSON 格式错误，将视为空配置"));
      return {};
    }
    throw e;
  }
}

export function writeConfigs<T = unknown>(provider: Provider, models: Record<string, T>): void {
  const filePath = getConfigFilePath(provider);
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(chalk.dim(`创建目录: ${dir}`));
  }

  const data: ModelStore<T> = { models };
  validateAndWriteJSON(filePath, data);
}
