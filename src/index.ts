import { Command } from "commander";
import {
  listCommand,
  addCommand,
  removeCommand,
  updateCommand,
  useCommand,
  currentCommand,
} from "./commands/claude";

const program = new Command();

program
  .name("ms")
  .description("模型配置切换工具")
  // NOTE: 与 package.json 的 version 字段保持同步
  .version("1.0.0");

const claude = program
  .command("claude")
  .description("管理 Claude Code 模型配置");

claude
  .command("list")
  .description("列出所有已保存的配置")
  .action(async () => {
    await listCommand();
  });

claude
  .command("add")
  .description("交互式新增模型配置")
  .action(async () => {
    await addCommand();
  });

claude
  .command("remove")
  .description("交互式移除模型配置")
  .action(async () => {
    await removeCommand();
  });

claude
  .command("update <config-name>")
  .description("更新已有模型配置")
  .action(async (configName: string) => {
    await updateCommand(configName);
  });

claude
  .command("use <config-name>")
  .description("激活指定配置")
  .action(async (configName: string) => {
    await useCommand(configName);
  });

claude
  .command("current")
  .description("显示当前激活的配置")
  .action(async () => {
    await currentCommand();
  });

program.parse();
