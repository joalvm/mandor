import { exampleItemOf } from '@mandor/collections';
import type { ErrorCode } from '@mandor/ipc';

import { requestsStore } from '../requests-store.js';

import { saveExample } from './example-draft-write.js';
import { saveRequest } from './pending-request-write.js';

type DraftState = Pick<ReturnType<typeof requestsStore.getState>, 'exampleDrafts' | 'pendings'>;

/** The resources of the examples of a request that hold a draft. */
function draftedExamplesOf(state: DraftState, itemResource: string): string[] {
    return Object.keys(state.exampleDrafts).filter(
        (resource) =>
            state.exampleDrafts[resource] !== undefined && exampleItemOf(resource) === itemResource,
    );
}

/**
 * Whether the tab of a request has something the file has not: its own draft, or the draft of one
 * of its examples — the schema of an example is typed on the answer, in the tab of the request.
 */
export function requestHasDraft(state: DraftState, itemResource: string): boolean {
    return (
        state.pendings[itemResource] !== undefined ||
        draftedExamplesOf(state, itemResource).length > 0
    );
}

/**
 * Ctrl+S on a request puts on the file its draft and then the drafts of its examples, one after
 * the other: each reads the file the one before wrote. The first refusal stops and answers its
 * code; whatever was not written keeps its draft.
 */
export async function saveRequestAndExamples(itemResource: string): Promise<ErrorCode | null> {
    const code = await saveRequest(itemResource);

    if (code !== null) {
        return code;
    }

    for (const resource of draftedExamplesOf(requestsStore.getState(), itemResource)) {
        const refused = await saveExample(resource);

        if (refused !== null) {
            return refused;
        }
    }

    return null;
}
