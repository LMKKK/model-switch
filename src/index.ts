import { Command } from "commander";
import fs from "fs";
import os from "os";
import path from "path";
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

const CMD = "ms";

function getCurrentShell(): "bash" | "zsh" | "fish" {
  const shell = process.env.SHELL || "";
  if (shell.includes("zsh")) return "zsh";
  if (shell.includes("bash")) return "bash";
  if (shell.includes("fish")) return "fish";
  return "bash";
}

function getShellConfigPath(shell: "bash" | "zsh"): string {
  const home = os.homedir();
  return shell === "zsh" ? path.join(home, ".zshrc") : path.join(home, ".bashrc");
}

function getCompletionConfigLine(shell: "bash" | "zsh"): string {
  return `eval "$(${CMD} completion ${shell})"`;
}

function isCompletionInstalled(shell: "bash" | "zsh"): boolean {
  const configPath = getShellConfigPath(shell);
  if (!fs.existsSync(configPath)) return false;
  return fs.readFileSync(configPath, "utf-8").includes(getCompletionConfigLine(shell));
}

function installCompletion(shell: "bash" | "zsh"): void {
  const configPath = getShellConfigPath(shell);
  const configLine = getCompletionConfigLine(shell);

  if (isCompletionInstalled(shell)) {
    console.log(`${shell}: 补全已安装`);
    return;
  }

  const lineToAdd = `\n# model-switch 补全\n${configLine}\n`;
  if (fs.existsSync(configPath)) {
    fs.appendFileSync(configPath, lineToAdd);
  } else {
    fs.writeFileSync(configPath, lineToAdd);
  }

  console.log(`已安装 ${shell} 补全到 ${configPath}`);
  console.log(`请运行: source ${configPath} 或重启终端`);
}

function installFishCompletion(): void {
  const fishCompletionsDir = path.join(os.homedir(), ".config", "fish", "completions");
  const fishCompletionFile = path.join(fishCompletionsDir, `${CMD}.fish`);

  if (!fs.existsSync(fishCompletionsDir)) {
    fs.mkdirSync(fishCompletionsDir, { recursive: true });
  }

  const content = `\
# fish completion for ${CMD}
complete -c ${CMD} -f -a "claude codex completion" -d "命令"
complete -c ${CMD} -f -n '__fish_seen_subcommand_from claude' -a "list add remove update use current" -d "子命令"
complete -c ${CMD} -f -n '__fish_seen_subcommand_from codex' -a "list add remove update use current" -d "子命令"
`;

  fs.writeFileSync(fishCompletionFile, content);
  console.log(`已安装 fish 补全到 ${fishCompletionFile}`);
  console.log(`请重启终端`);
}

function outputBashCompletion(): void {
  console.log(`# bash completion for ${CMD}
_ms_completions() {
  local cur
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=($(compgen -W "claude codex completion" -- "\$cur"))
  elif [[ \${COMP_CWORD} -eq 2 ]]; then
    case "\${COMP_WORDS[1]}" in
      claude|codex) COMPREPLY=($(compgen -W "list add remove update use current" -- "\$cur")) ;;
    esac
  fi
}
complete -F _ms_completions ${CMD}
`);
}

function outputZshCompletion(): void {
  console.log(`# zsh completion for ${CMD}
(( \$+functions[compdef] )) || { autoload -Uz compinit && compinit -u 2>/dev/null }

function _ms_completions {
  local -a commands subcommands
  case \$CURRENT in
    2)
      commands=(claude:管理 codex:管理 completion:生成)
      _describe 'command' commands
      ;;
    3)
      case "\$words[2]" in
        claude|codex)
          subcommands=(list:列出 add:新增 remove:移除 update:更新 use:激活 current:当前)
          _describe 'subcommand' subcommands
          ;;
      esac
      ;;
  esac
}
compdef _ms_completions ${CMD}
`);
}

function outputFishCompletion(): void {
  console.log(`# fish completion for ${CMD}
complete -c ${CMD} -f -a "claude codex completion" -d "命令"
complete -c ${CMD} -f -n '__fish_seen_subcommand_from claude' -a "list add remove update use current" -d "子命令"
complete -c ${CMD} -f -n '__fish_seen_subcommand_from codex' -a "list add remove update use current" -d "子命令"
`);
}

program
  .name("ms")
  .description("模型配置切换工具")
  .version(pkg.version);

program
  .command("completion [shell]")
  .description("生成或安装 shell 补全脚本 (bash|zsh|fish)")
  .option("-i, --install", "安装到 shell 配置而非输出到 stdout")
  .action((shellArg?: string, opts?: { install?: boolean }) => {
    const shell = shellArg || getCurrentShell();
    if (!["bash", "zsh", "fish"].includes(shell)) {
      console.error(`不支持的 shell: ${shell}，支持的选项: bash, zsh, fish`);
      process.exit(1);
    }
    if (opts?.install) {
      if (shell === "fish") {
        installFishCompletion();
      } else {
        installCompletion(shell as "bash" | "zsh");
      }
    } else {
      if (shell === "bash") outputBashCompletion();
      else if (shell === "zsh") outputZshCompletion();
      else outputFishCompletion();
    }
  });

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
  .command("update [config-name]")
  .description("更新已有模型配置")
  .action(async (configName?: string) => {
    await updateCommand(configName);
  });

claude
  .command("use [config-name]")
  .description("激活指定配置")
  .action(async (configName?: string) => {
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
  .command("update [config-name]")
  .description("更新已有模型配置")
  .action(async (configName?: string) => {
    await updateCodex(configName);
  });

codex
  .command("use [config-name]")
  .description("激活指定配置")
  .action(async (configName?: string) => {
    await useCodex(configName);
  });

codex
  .command("current")
  .description("显示当前激活的配置")
  .action(async () => {
    await currentCodex();
  });

program.parse();
