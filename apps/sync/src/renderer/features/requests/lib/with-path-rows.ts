import type { RequestItem, RequestLine } from '@mandor/schema';
import { pathPlaceholdersOf } from '@mandor/vars';

/**
 * What a change to the request also changes: a url that names a `{parameter}` in its path gets a
 * row for it, empty, so the person sees what is left to fill. The rows that name nothing any
 * more stay: they may be a value the person is about to use again.
 */
export function withPathRows(
    request: RequestItem,
    changes: Partial<RequestItem>,
): Partial<RequestItem> {
    if (changes.url === undefined) {
        return changes;
    }

    const rows = changes.pathParams ?? request.pathParams;
    const known = new Set(rows.map((row) => row.key));
    const added = pathPlaceholdersOf(changes.url)
        .filter((name) => !known.has(name))
        .map((key): RequestLine => ({ enabled: true, key, value: '' }));

    return added.length === 0 ? changes : { ...changes, pathParams: [...rows, ...added] };
}
