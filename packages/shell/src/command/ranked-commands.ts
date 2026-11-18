import { matchSorter, rankings } from 'match-sorter';

import type { Command } from './command-registry.js';

/** A command with its title already read in the current language, which is what is matched. */
export type NamedCommand = Command & { name: string; shortcut: string | undefined };

function place(id: string, recent: readonly string[]): number {
    const found = recent.indexOf(id);

    return found === -1 ? recent.length : found;
}

/**
 * The commands to list, in the order to list them.
 *
 * What was run last comes first, so the palette gets shorter for whoever repeats a task, and what
 * was typed decides the rest. Word initials count as a match: `sgr` finds `Split group right`,
 * which is how a name is remembered once it has been read a few times.
 */
export function rankedCommands(
    commands: readonly NamedCommand[],
    query: string,
    recent: readonly string[],
): NamedCommand[] {
    const used = [...commands].sort(
        (one, other) => place(one.id, recent) - place(other.id, recent),
    );

    if (query.trim().length === 0) {
        return used;
    }

    return matchSorter(used, query, {
        baseSort: (one, other) => one.index - other.index,
        keys: ['name'],
        threshold: rankings.ACRONYM,
    });
}
