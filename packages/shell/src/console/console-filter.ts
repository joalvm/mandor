import type { ConsoleLevel } from '@mandor/ui';

import type { ConsoleRecord } from './console-entries.js';

/** Which levels the console shows: every one, or one of them, as a browser filters its own. */
export type ConsoleLevelFilter = ConsoleLevel | 'all';

export type ConsoleFilter = {
    level: ConsoleLevelFilter;
    /** Text an entry has to hold, in its line, its detail or its source; any case. */
    query: string;
    /** The requests that went out to the network are shown with the rest. */
    showNetwork: boolean;
};

function holds(entry: ConsoleRecord, query: string): boolean {
    return [entry.text, entry.detail, entry.source].some(
        (text) => text?.toLowerCase().includes(query) === true,
    );
}

/** The entries the reader asked to see, in the order they were written. */
export function visibleEntries(
    entries: readonly ConsoleRecord[],
    filter: ConsoleFilter,
): readonly ConsoleRecord[] {
    const query = filter.query.trim().toLowerCase();

    if (filter.level === 'all' && query === '' && filter.showNetwork) {
        return entries;
    }

    return entries.filter(
        (entry) =>
            (filter.level === 'all' || entry.level === filter.level) &&
            (filter.showNetwork || entry.network !== true) &&
            (query === '' || holds(entry, query)),
    );
}
