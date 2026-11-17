import type { RequestItem } from '@mandor/schema';
import { fireAndForget, useFailureToast, useKeepTab } from '@mandor/shell';

import { editRequest } from '../../lib/pending-request-write.js';
import { saveAnyRequest } from '../../lib/save-any-request.js';
import { withPathRows } from '../../lib/with-path-rows.js';

type RequestDraftArgs = {
    resource: string;
};

/**
 * What the panel does with the draft of its request: edit it in the window, and put it on the
 * file when the person saves it with Ctrl+S — the way Sync keeps a request, and not the way
 * Async keeps what a connection carries, which is its own to write. One saved nowhere asks where
 * it goes first, and staying out of that question says nothing. An edit without an item
 * under the panel does nothing; there is no draft without a request. The first edit keeps the tab.
 */
export function useRequestDraft(
    { resource }: RequestDraftArgs,
    request: RequestItem | undefined,
): {
    edit: (changes: Partial<RequestItem>) => void;
    save: () => void;
} {
    const notifyFailure = useFailureToast();
    const keep = useKeepTab();

    return {
        edit: (changes) => {
            if (request === undefined) {
                return;
            }

            // An edited request is no longer a look the next click replaces.
            keep();
            editRequest(resource, { ...request, ...withPathRows(request, changes) });
        },
        save: () => {
            fireAndForget(
                saveAnyRequest(resource).then((outcome) => {
                    if (outcome !== null && outcome !== 'kept') {
                        notifyFailure(outcome);
                    }
                }),
            );
        },
    };
}
