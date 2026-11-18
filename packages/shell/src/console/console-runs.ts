import type { LogLine } from '@mandor/ui';

/** What one piece of work wrote to the console, under the heading that names it. */
export type ConsoleRun = {
    id: string;
    title: string;
    lines: readonly LogLine[];
    /** What its lines weigh, in bytes of the window's strings. */
    bytes: number;
};

/** What every run of the console may weigh together, in bytes of the window's strings. */
export const CONSOLE_BYTES = 4 * 1024 * 1024;

/** A string of the window holds two bytes a character. */
function weightOf(lines: readonly LogLine[]): number {
    return lines.reduce(
        (sum, line) => sum + (line.text.length + (line.detail?.length ?? 0)) * 2,
        0,
    );
}

/** The oldest runs go first, never the one just written, until all of them fit under the ceiling. */
function underCeiling(runs: readonly ConsoleRun[], newest: string): readonly ConsoleRun[] {
    let total = runs.reduce((sum, run) => sum + run.bytes, 0);
    const gone = new Set<string>();

    for (const run of runs) {
        if (total <= CONSOLE_BYTES) {
            break;
        }

        if (run.id !== newest) {
            total -= run.bytes;
            gone.add(run.id);
        }
    }

    return gone.size === 0 ? runs : runs.filter((run) => !gone.has(run.id));
}

/**
 * The runs with these lines written under the run of that id: at its end when it was already
 * there, and as the newest run when it opens with them.
 */
export function writtenRuns(
    runs: readonly ConsoleRun[],
    run: { id: string; title: string },
    lines: readonly LogLine[],
): readonly ConsoleRun[] {
    const bytes = weightOf(lines);
    const known = runs.some((each) => each.id === run.id);
    const grown = known
        ? runs.map((each) =>
              each.id === run.id
                  ? { ...each, lines: [...each.lines, ...lines], bytes: each.bytes + bytes }
                  : each,
          )
        : [...runs, { ...run, lines: [...lines], bytes }];

    return underCeiling(grown, run.id);
}

/** Every run as one list: its heading, then its lines, each keyed apart from the other runs. */
export function consoleLinesOf(runs: readonly ConsoleRun[]): LogLine[] {
    return runs.flatMap((run) => [
        { key: `${run.id}/heading`, tone: 'heading' as const, text: run.title },
        ...run.lines.map((line) => ({ ...line, key: `${run.id}/${line.key}` })),
    ]);
}

/** How many lines of every run read as a fault and as a warning: what the status line tells. */
export function consoleCounts(runs: readonly ConsoleRun[]): { errors: number; warnings: number } {
    const tones = runs.flatMap((run) => run.lines.map((line) => line.tone));

    return {
        errors: tones.filter((tone) => tone === 'error').length,
        warnings: tones.filter((tone) => tone === 'warn').length,
    };
}
