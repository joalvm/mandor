import { exampleItemOf, exampleRootOf } from '@mandor/collections';
import { selectOpenResources, shellStore } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';

/**
 * The tab of an example lets go of its draft, and of the request it read when no other tab looks
 * at that request: neither the tab of the item nor another tab of one of its examples. It runs as
 * the tab leaves, before the window is laid out again, so the resource of the tab itself is still
 * among the open ones and does not count.
 */
export function releaseExample(resource: string): void {
    requestsStore.getState().forget(resource);

    const item = exampleItemOf(resource);

    if (item === null) {
        return;
    }

    const watched = selectOpenResources(shellStore.getState()).some(
        (open) => open !== resource && (open === item || exampleItemOf(open) === item),
    );

    if (!watched) {
        requestsStore.getState().forget(item);
    }
}

/** The tab of a request keeps what it read while a tab of one of its examples still needs it. */
export function releaseRequestItem(resource: string): void {
    const root = `${exampleRootOf(resource)}/`;

    if (selectOpenResources(shellStore.getState()).some((open) => open.startsWith(root))) {
        return;
    }

    requestsStore.getState().forget(resource);
}
