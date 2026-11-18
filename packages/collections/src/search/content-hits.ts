import type { CollectionSearchHit } from '@mandor/ipc';
import type { SearchEntry } from '@mandor/shell';

import type { SearchHit } from './search-workspace.js';

/**
 * The lines main found through the files, read as the entries the window lists. Main answers
 * with the resource and the line, never a name: the name lives in the file and in the tree, and
 * the row of a hit is the same row the memory search draws for that entry. A hit of a file the
 * window does not list (the manifest of a collection, say) has no row, and is left out. The row
 * names the file and not the line, so a file with many lines found is one row.
 */
export function contentHits(
    entries: readonly SearchEntry[],
    hits: readonly CollectionSearchHit[],
): SearchHit[] {
    const byResource = new Map(entries.map((entry) => [entry.resource, entry]));

    return [...new Set(hits.map((hit) => hit.resource))].flatMap((resource) => {
        const entry = byResource.get(resource);

        return entry === undefined ? [] : [{ ...entry, matched: 'content' as const }];
    });
}
