import chalk from "chalk";

export function printDiffSection<K extends string>(
  values: Partial<Record<K, string>>,
  keys: K[],
  labels: Record<K, string>,
  diffKeys: Set<K>,
  formatValue?: (key: K, value: string) => string,
): void {
  const labelWidth = Math.max(...keys.map(k => labels[k].length));

  for (const key of keys) {
    const raw = values[key] ?? "";
    const hasValue = raw.length > 0;
    const shown = hasValue ? (formatValue ? formatValue(key, raw) : raw) : chalk.dim("(未设置)");
    const label = labels[key].padEnd(labelWidth);
    const isDiff = diffKeys.has(key);

    if (isDiff) {
      const marker = chalk.red("!");
      const highlighted = hasValue ? chalk.yellow(shown) : shown;
      console.log(`  ${marker} ${chalk.bold(label)}: ${highlighted}`);
    } else {
      console.log(`    ${chalk.dim(label + ":")} ${shown}`);
    }
  }
  console.log();
}

export function computeDiffKeys<K extends string>(
  keys: K[],
  a: Partial<Record<K, string>>,
  b: Partial<Record<K, string>>,
): Set<K> {
  const diff = new Set<K>();
  for (const key of keys) {
    const va = a[key] ?? "";
    const vb = b[key] ?? "";
    if (va !== vb) diff.add(key);
  }
  return diff;
}
