import type { Connection } from '@mandor/schema';
import type { EntryLine } from '@mandor/env';

/** The two records a set of lines stands for: what is sent, and what is on hold. */
export type EntryRecords = {
    off: Record<string, string>;
    on: Record<string, string>;
};

/** The auth records a Socket.IO connection carries in its handshake, right now. */
export function authRecordsOf(connection: Connection): EntryRecords {
    return {
        off: connection.socketio?.disabledAuth ?? {},
        on: connection.socketio?.auth ?? {},
    };
}

/** The lines the records stand for: the ones being sent first, then the ones on hold. */
export function linesOf(records: EntryRecords): EntryLine[] {
    return [
        ...Object.entries(records.on).map(([name, value], index) => ({
            disabled: false,
            id: String(index),
            name,
            value,
        })),
        ...Object.entries(records.off).map(([name, value], index) => ({
            disabled: true,
            id: String(1_000 + index),
            name,
            value,
        })),
    ];
}

/** The records a set of lines stands for. A line with no name names no entry yet. */
export function writtenOf(lines: readonly EntryLine[]): EntryRecords {
    const on = lines.filter((line) => !line.disabled);
    const off = lines.filter((line) => line.disabled);
    const record = (entries: readonly EntryLine[]): Record<string, string> =>
        Object.fromEntries(
            entries.filter((line) => line.name !== '').map((line) => [line.name, line.value]),
        );

    return { off: record(off), on: record(on) };
}

/** Whether two pairs of records say the same thing, whatever object carries them. */
export function sameRecords(left: EntryRecords, right: EntryRecords): boolean {
    const same = (one: Record<string, string>, other: Record<string, string>): boolean =>
        Object.keys(one).length === Object.keys(other).length &&
        Object.keys(one).every((name) => one[name] === other[name]);

    return same(left.off, right.off) && same(left.on, right.on);
}
