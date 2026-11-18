export type Coverage = { statements: number; branches: number; functions: number; lines: number };

export function packageThresholds(
    root: string,
    dir: string,
    below: Readonly<Record<string, { floor: Coverage }>>,
    full: Coverage,
): [string, Coverage][];
