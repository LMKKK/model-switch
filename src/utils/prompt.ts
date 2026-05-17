import {
  createPrompt,
  useState,
  useKeypress,
  useEffect,
  usePrefix,
  isEnterKey,
  makeTheme,
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
