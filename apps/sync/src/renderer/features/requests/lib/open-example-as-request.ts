import { exampleItemOf, examplePartsOf } from '@mandor/collections';
import { exampleRequest } from '@mandor/schema';
import { shellStore } from '@mandor/shell';

import { requestsStore } from '../requests-store.js';
import { exampleAt } from './example-draft-write.js';
import { openLooseRequest } from './open-loose-request.js';

/**
 * Opens an example as a request of its own: the request it hangs from with what the example
 * changes laid over it, in a tab that belongs to no collection yet. The copy carries no examples,
 * and it is named after both, so it is told apart from the request it came from.
 */
export function openExampleAsRequest(resource: string): void {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);
    const parent = item === null ? undefined : requestsStore.getState().requests[item];
    const example = exampleAt(parent, parts?.key ?? '');

    if (parent === undefined || example === undefined) {
        return;
    }

    openLooseRequest(
        shellStore.getState().activeGroupId,
        `${parent.name} — ${example.name}`,
        (blank) => ({
            ...blank,
            ...exampleRequest(parent, example),
            examples: [],
            name: blank.name,
        }),
    );
}
