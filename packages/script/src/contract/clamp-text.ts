import { scriptNotice, type ChainLog, type ScriptNotice, type ScriptTest } from '@mandor/schema';

import { byteLength, truncateUtf8 } from './utf8.js';

/** What the console and the cases of a run may spend. */
export type TextLimits = { lineBytes: number; outputBytes: number };

/** What a cut line ends with, so nothing is ever cut in silence. */
export const CUT_MARK = '…[cut]';

/** A line over the limit, cut in bytes and marked; one that fits is the same one. */
export function cutLine(text: string, lineBytes: number): string {
    if (byteLength(text) <= lineBytes) {
        return text;
    }

    return `${truncateUtf8(text, lineBytes - byteLength(CUT_MARK))}${CUT_MARK}`;
}

type Budget = { left: number; closed: boolean };

/**
 * What fits in what is left of the output, in order. The first item that does not fit closes the
 * budget: nothing after it is kept, so what the person reads never has a hole in the middle.
 */
function fitting<T>(items: readonly T[], sizeOf: (item: T) => number, budget: Budget): T[] {
    const kept: T[] = [];

    for (const item of items) {
        const size = sizeOf(item);

        if (budget.closed || size > budget.left) {
            budget.closed = true;
        } else {
            budget.left -= size;
            kept.push(item);
        }
    }

    return kept;
}

function cutTest(test: ScriptTest, lineBytes: number): ScriptTest {
    const { message, ...rest } = test;

    return {
        ...rest,
        name: cutLine(test.name, lineBytes),
        ...(message === undefined ? {} : { message: cutLine(message, lineBytes) }),
    };
}

/** The one line that says what was left out of the output, when anything was. */
function noteOf(lines: number, cases: number): ScriptNotice[] {
    return lines + cases === 0 ? [] : [scriptNotice('output-cut', { lines, cases })];
}

/** A line with what it says cut to `lineBytes`: its text, or each text a notice interpolates. */
function cutLog(log: ChainLog, lineBytes: number): ChainLog {
    if ('text' in log) {
        return { ...log, text: cutLine(log.text, lineBytes) };
    }

    const { params } = log;

    if (params === undefined) {
        return log;
    }

    const cut = Object.entries(params).map(([name, value]) => [
        name,
        typeof value === 'string' ? cutLine(value, lineBytes) : value,
    ]);

    return { ...log, params: Object.fromEntries(cut) as typeof params };
}

/** What a line spends of the output: its text, or the texts and numbers of a notice. */
function bytesOf(log: ChainLog): number {
    if ('text' in log) {
        return byteLength(log.text);
    }

    return Object.values(log.params ?? {}).reduce<number>(
        (sum, value) => sum + byteLength(String(value)),
        byteLength(log.notice),
    );
}

/**
 * The console and the cases of a run inside their limits: each line cut and marked, and the
 * output closed at its size, with a note of how much did not fit. Sizes are UTF-8 bytes. The cases
 * take the room first: they are the result, and a script that floods its console keeps them.
 */
export function clampText(
    logs: readonly ChainLog[],
    tests: readonly ScriptTest[],
    { lineBytes, outputBytes }: TextLimits,
): { logs: ChainLog[]; tests: ScriptTest[]; notes: ScriptNotice[] } {
    const testsBudget: Budget = { left: outputBytes, closed: false };
    const keptTests = fitting(
        tests.map((test) => cutTest(test, lineBytes)),
        ({ name, message }) => byteLength(name) + byteLength(message ?? ''),
        testsBudget,
    );
    const keptLogs = fitting(
        logs.map((log) => cutLog(log, lineBytes)),
        bytesOf,
        { left: testsBudget.left, closed: false },
    );

    return {
        logs: keptLogs,
        tests: keptTests,
        notes: noteOf(logs.length - keptLogs.length, tests.length - keptTests.length),
    };
}
