import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ModelConfig, ModelStore } from "../types";
import chalk from "chalk";

export function getConfigFilePath(): string {
  return join(homedir(), ".model-switch", "configs", "claude", "settings.json");
}

export function readConfigs(): Record<string, ModelConfig> {
  const filePath = getConfigFilePath();

  if (!existsSync(filePath)) {
    return {};
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const data: ModelStore = JSON.parse(raw);
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

export function writeConfigs(models: Record<string, ModelConfig>): void {
  const filePath = getConfigFilePath();
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(chalk.dim(`创建目录: ${dir}`));
  }

  const data: ModelStore = { models };
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
