import { itemPartsOf } from '@mandor/collections';
import type { HttpResponse, RequestLine } from '@mandor/schema';
import { fireAndForget } from '@mandor/shell';

import type { SendEntry } from '../responses.slice.js';

/** Keeping the answer is offered once there is one: a send that is done. */
export function keepWhenDone(entry: SendEntry, keep: () => void): (() => void) | undefined {
    if (entry.state !== 'done') {
        return undefined;
    }

    return keep;
}

/**
 * Keeping the answer of a request as one of its examples, when there is an answer and a file to
 * hold it: a request saved nowhere has none, and is not offered the button.
 */
export function keepResponse(
    resource: string,
    entry: SendEntry,
    save: (resource: string, response: HttpResponse, query?: RequestLine[]) => Promise<void>,
): (() => void) | undefined {
    if (itemPartsOf(resource) === null) {
        return undefined;
    }

    return keepWhenDone(entry, () => {
        if (entry.state === 'done') {
            fireAndForget(save(resource, entry.response, entry.query));
        }
    });
}
