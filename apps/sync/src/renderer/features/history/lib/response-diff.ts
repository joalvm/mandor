import type { HttpResponse } from '@mandor/schema';

import { bodyDiff, type BodyChange } from './body-diff.js';
import { headerDiff, type HeaderDiffRow } from './header-diff.js';

export type FactKey = 'bodyBytes' | 'status' | 'totalMs' | 'version';

export type FactRow = {
    after: number | string;
    before: number | string;
    key: FactKey;
    same: boolean;
};

export type ResponseDiff = {
    body: BodyChange;
    facts: FactRow[];
    headers: HeaderDiffRow[];
};

function fact(key: FactKey, before: number | string, after: number | string): FactRow {
    return { after, before, key, same: before === after };
}

/**
 * Two responses set side by side: the four numbers a reader looks at first, the headers that
 * were added, removed or changed, and the body. It is the model of a view of this app, so it
 * lives with the view and carries no text: the words come where the rows are drawn.
 */
export function responseDiff(before: HttpResponse, after: HttpResponse): ResponseDiff {
    return {
        body: bodyDiff(before, after),
        facts: [
            fact('status', before.status, after.status),
            fact('version', before.httpVersion, after.httpVersion),
            fact('totalMs', before.timings.totalMs, after.timings.totalMs),
            fact('bodyBytes', before.sizes.bodyBytes, after.sizes.bodyBytes),
        ],
        headers: headerDiff(before.headers, after.headers),
    };
}
