import { Command } from "commander";
import pkg from "../package.json" with { type: "json" };
import {
  listCommand,
  addCommand,
  removeCommand,
  updateCommand,
  useCommand,
  currentCommand,
} from "./commands/claude";
import {
  listCommand as listCodex,
  addCommand as addCodex,
  removeCommand as removeCodex,
  updateCommand as updateCodex,
  useCommand as useCodex,
  currentCommand as currentCodex,
} from "./commands/codex";

const program = new Command();

program
  .name("ms")
  .description("模型配置切换工具")
  .version(pkg.version);

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

const codex = program
  .command("codex")
  .description("管理 Codex CLI 模型配置");

codex
  .command("list")
  .description("列出所有已保存的配置")
  .action(async () => {
    await listCodex();
  });

codex
  .command("add")
  .description("交互式新增模型配置")
  .action(async () => {
    await addCodex();
  });

codex
  .command("remove")
  .description("交互式移除模型配置")
  .action(async () => {
    await removeCodex();
  });

codex
  .command("update <config-name>")
  .description("更新已有模型配置")
  .action(async (configName: string) => {
    await updateCodex(configName);
  });

codex
  .command("use <config-name>")
  .description("激活指定配置")
  .action(async (configName: string) => {
    await useCodex(configName);
  });

codex
  .command("current")
  .description("显示当前激活的配置")
  .action(async () => {
    await currentCodex();
  });

program.parse();
