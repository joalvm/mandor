import type { ConsoleEntry, ConsoleLevel, LogLine, LogTone } from '@mandor/ui';

/** What a piece of work writes to the console; the console stamps its key and its time. */
export type ConsoleWrite = Omit<ConsoleEntry, 'at' | 'key'> & {
    /** A request that went out to the network, which the reader can hide apart from the rest. */
    network?: boolean | undefined;
};

/** An entry as the console keeps it, with what it weighs, so the oldest can leave first. */
export type ConsoleRecord = ConsoleEntry & {
    bytes: number;
    network?: boolean | undefined;
};

/**
 * What every entry of the console may weigh together, in bytes of the window's strings. The heap
 * holds about twice that once the objects, keys and section trees around the text are counted:
 * two thousand sends filled 4 MiB of text and grew the window by 9 MB. Two of text keep the
 * console near 4 MB of memory.
 */
export const CONSOLE_BYTES = 2 * 1024 * 1024;

/** How a line of a log reads as an entry of the console, by its tone. */
const TONE_LEVELS: Readonly<Record<LogTone, ConsoleLevel>> = {
    error: 'error',
    failed: 'error',
    heading: 'log',
    info: 'info',
    log: 'log',
    note: 'info',
    passed: 'info',
    warn: 'warn',
};

/** How long a value is once written out; one that cannot be written weighs nothing. */
function lengthOf(value: unknown): number {
    if (typeof value === 'string') {
        return value.length;
    }

    try {
        // Typed as a string, but it answers nothing for `undefined` and for a function.
        const json = JSON.stringify(value) as string | undefined;

        return json?.length ?? 0;
    } catch {
        return 0;
    }
}

/** A string of the window holds two bytes a character. */
function weightOf(write: ConsoleWrite): number {
    const texts = [write.text, write.detail, write.source, write.status?.text, write.time];
    const sections = (write.sections ?? []).map((section) => lengthOf(section.value));
    const characters = [...texts.map((text) => text?.length ?? 0), ...sections];

    return characters.reduce((sum, length) => sum + length, 0) * 2;
}

/** The entries as the console keeps them, keyed from `first` on and stamped `at`. */
export function recordsOf(
    writes: readonly ConsoleWrite[],
    first: number,
    at: number,
): ConsoleRecord[] {
    return writes.map((write, index) => ({
        ...write,
        key: String(first + index),
        at,
        bytes: weightOf(write),
    }));
}

/**
 * The entries with these written at the end, the oldest leaving first, never one just written,
 * until all of them fit under the ceiling.
 */
export function writtenEntries(
    entries: readonly ConsoleRecord[],
    written: readonly ConsoleRecord[],
): readonly ConsoleRecord[] {
    const all = [...entries, ...written];
    let total = all.reduce((sum, entry) => sum + entry.bytes, 0);
    let start = 0;

    while (total > CONSOLE_BYTES && start < entries.length) {
        total -= all[start]?.bytes ?? 0;
        start += 1;
    }

    return start === 0 ? all : all.slice(start);
}

/** Lines of a log written as entries of the console, each one saying where it came from. */
export function consoleWritesOf(
    lines: readonly Omit<LogLine, 'key'>[],
    source?: string,
): ConsoleWrite[] {
    return lines.map((line) => ({
        level: TONE_LEVELS[line.tone],
        text: line.text,
        detail: line.detail,
        source,
    }));
}

/** The levels the status line counts, and under which name. */
const COUNTED: Readonly<Partial<Record<ConsoleLevel, 'errors' | 'warnings'>>> = {
    error: 'errors',
    warn: 'warnings',
};

/** How many entries read as a fault and as a warning: what the status line tells. */
export function consoleCounts(entries: readonly ConsoleEntry[]): {
    errors: number;
    warnings: number;
} {
    const counts = { errors: 0, warnings: 0 };

    for (const entry of entries) {
        const counted = COUNTED[entry.level];

        if (counted !== undefined) {
            counts[counted] += 1;
        }
    }

    return counts;
}
