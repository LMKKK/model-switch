import { writeFileSync } from "node:fs";
import chalk from "chalk";

export function validateAndWriteJSON(filePath: string, data: unknown): void {
  let json: string;
  try {
    json = JSON.stringify(data, null, 2);
  } catch {
    console.error(chalk.red("JSON 序列化失败，拒绝写入文件"));
    return;
  }

  try {
    JSON.parse(json);
  } catch {
    console.error(chalk.red("JSON 格式校验失败，拒绝写入文件"));
    return;
  }

  writeFileSync(filePath, json + "\n", "utf-8");
}
