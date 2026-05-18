import {
  createPrompt,
  useState,
  useKeypress,
  useEffect,
  usePrefix,
  isEnterKey,
  isUpKey,
  isDownKey,
  isTabKey,
  makeTheme,
  CancelPromptError,
  type Status,
} from "@inquirer/core";
export interface PrefillInputConfig {
  message: string;
  initial: string;
}

/**
 * 预填充文本输入 prompt。
 * 与 @inquirer/input 的区别：清空输入后回车返回空字符串，不会回退到默认值。
 * 使用 @inquirer/core 的 createPrompt 构建，将 initial 直接写入 TTY 输入缓冲区。
 */
export const prefillInput = createPrompt<string, PrefillInputConfig>(
  (config, done) => {
    const theme = makeTheme();
    const [status, setStatus] = useState<Status>("idle");
    const [value, setValue] = useState("");
    const prefix = usePrefix({ status, theme });

    useKeypress((key, rl) => {
      if (status !== "idle") return;

      if (isEnterKey(key)) {
        setStatus("done");
        done(value);
      } else {
        setValue(rl.line);
      }
    });

    useEffect((rl) => {
      if (config.initial) {
        rl.write(config.initial);
        setValue(config.initial);
      }
    }, []);

    const msg = theme.style.message(config.message, status);
    const display =
      status === "done" ? theme.style.answer(value) : value;

    return `${prefix} ${msg} ${display}`;
  },
);

export interface DetailSelectChoice {
  name: string;
  value: string;
  detail?: () => string;
}

export interface DetailSelectConfig {
  message: string;
  choices: DetailSelectChoice[];
}

export const detailSelect = createPrompt<string, DetailSelectConfig>(
  (config, done) => {
    const theme = makeTheme();
    const [status, setStatus] = useState<Status>("idle");
    const [cursor, setCursor] = useState(0);
    const [showDetail, setShowDetail] = useState(false);
    const [cancelled, setCancelled] = useState(false);
    const prefix = usePrefix({ status, theme });
    const choicesLen = config.choices.length;

    useKeypress((key) => {
      if (status !== "idle") return;

      if (isEnterKey(key)) {
        setStatus("done");
        done(config.choices[cursor]!.value);
      } else if (isUpKey(key) || key.name === "k") {
        setCursor((cursor - 1 + choicesLen) % choicesLen);
        setShowDetail(false);
      } else if (isDownKey(key) || key.name === "j") {
        setCursor((cursor + 1) % choicesLen);
        setShowDetail(false);
      } else if (isTabKey(key)) {
        setShowDetail(!showDetail);
      } else if (key.name === "escape") {
        setCancelled(true);
        setStatus("done");
      }
    });

    if (config.choices.length === 0) {
      setStatus("done");
      throw new Error("没有可用的配置，请先使用 add 命令添加配置");
    }

    if (cancelled) {
      throw new CancelPromptError();
    }

    const msg = theme.style.message(config.message, status);

    if (status === "done") {
      const answer = config.choices[cursor]?.name ?? "";
      return `${prefix} ${msg} ${theme.style.answer(answer)}`;
    }

    const hints = theme.style.help("↑/↓ 导航  Tab 详情  Enter 确认  Esc 取消");

    const choiceLines = config.choices.map((choice, i) => {
      const isCursor = i === cursor;
      const marker = isCursor ? theme.style.highlight("●") : " ";
      const choiceName = isCursor
        ? theme.style.highlight(choice.name)
        : choice.name;
      return `   ${marker} ${choiceName}`;
    });

    let detailSection: string | undefined;
    if (showDetail && config.choices[cursor]?.detail) {
      detailSection = config.choices[cursor]!.detail!();
    }

    return [`${prefix} ${msg}\n${choiceLines.join("\n")}\n${hints}`, detailSection];
  },
);
