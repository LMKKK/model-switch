## 1. Modify claude.ts update prompt

- [x] 1.1 In `src/commands/claude.ts` line ~205, change message from `${KEY_LABELS[key]} [当前: ${currentValue || "(空)"}]` to `${KEY_LABELS[key]}`

## 2. Modify codex.ts update prompt

- [x] 2.1 In `src/commands/codex.ts` line ~221, change message from `${KEY_LABELS[key]} [当前: ${displayValue || "(空)"}]` to `${KEY_LABELS[key]}`

## 3. Verify

- [x] 3.1 Run `bun run src/index.ts claude --help` to confirm CLI still works
- [x] 3.2 Verify the change compiles without errors via `npx tsc --noEmit`