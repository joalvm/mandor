import type { SearchEntry, SearchField } from '@mandor/shell';
import { matchSorter, rankings } from 'match-sorter';

/** A hit is the entry plus the field that matched, which the result row shows. */
export type SearchHit = SearchEntry & { matched: SearchField };

/**
 * One letter is noise: everything contains it. Two is the shortest query that filters, and the
 * box says so instead of listing the whole workspace.
 */
export const MIN_SEARCH_QUERY = 2;

/**
 * Ranks the entries of the open workspace against the query. Pure: the list goes in and the
 * ranking comes out. A name weighs more than a trail and a trail more than a tag, because the
 * name is what the user typed from memory.
 */
export function searchWorkspace(entries: readonly SearchEntry[], query: string): SearchHit[] {
    if (query.trim().length < MIN_SEARCH_QUERY) {
        return [];
    }

    const byName = rank(entries, query, (each) => each.name);
    const byTrail = rank(rest(entries, byName), query, (each) => each.trail);
    const byTag = rank(rest(entries, [...byName, ...byTrail]), query, (each) => [...each.tags]);

    return [
        ...withMatch(byName, 'name'),
        ...withMatch(byTrail, 'trail'),
        ...withMatch(byTag, 'tag'),
    ];
}

function rank(
    entries: readonly SearchEntry[],
    query: string,
    key: (entry: SearchEntry) => string | string[],
): SearchEntry[] {
    return matchSorter(entries, query, {
        baseSort: (one, other) => one.index - other.index,
        keys: [key],
        threshold: rankings.CONTAINS,
    });
}

/** Looked up in a set: a list searched per entry took 36 ms per key for 20 000 entries. */
function rest(entries: readonly SearchEntry[], taken: readonly SearchEntry[]): SearchEntry[] {
    const held = new Set(taken);

    return entries.filter((each) => !held.has(each));
}

function withMatch(entries: readonly SearchEntry[], matched: SearchField): SearchHit[] {
    return entries.map((each) => ({ ...each, matched }));
}
