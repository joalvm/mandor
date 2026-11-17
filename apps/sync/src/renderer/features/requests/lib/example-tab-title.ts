import { exampleItemOf, examplePartsOf } from '@mandor/collections';

import { requestsStore } from '../requests-store.js';

import { exampleAt } from './example-draft-write.js';

/**
 * What the tab of an example says: the name it has in its request, and nothing while the request
 * has not been read. The key of the example and the resource are never drawn.
 */
export function exampleTabTitle(resource: string): string {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);

    if (parts === null || item === null) {
        return '';
    }

    return exampleAt(requestsStore.getState().requests[item], parts.key)?.name ?? '';
}
