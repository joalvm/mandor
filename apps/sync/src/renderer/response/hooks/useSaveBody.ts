import { useMessages } from '@mandor/i18n';
import type { HttpResponse } from '@mandor/schema';
import { fireAndForget, useFailureToast } from '@mandor/shell';
import { useToast } from '@mandor/ui';

import type { BodyKind } from '../lib/body-views.js';
import { saveBody, type SaveOutcome } from '../lib/save-body.js';

type OutcomeOf<S extends SaveOutcome['state']> = Extract<SaveOutcome, { state: S }>;

/** What the person is told of each way a save ends. */
type Tellers = { [S in SaveOutcome['state']]: (outcome: OutcomeOf<S>) => void };

function tellIn<S extends SaveOutcome['state']>(
    tellers: Tellers,
    state: S,
    outcome: OutcomeOf<S>,
): void {
    tellers[state](outcome);
}

/** Saves the body of a response and tells the user how it went; closing the dialog says nothing. */
export function useSaveBody(response: HttpResponse, kind: BodyKind): () => void {
    const notifyFailure = useFailureToast();
    const labels = useMessages('requests');
    const toast = useToast();
    const tellers: Tellers = {
        // Closing the dialog is the person's own answer: there is nothing to tell them.
        cancelled: () => undefined,
        failed: ({ error }) => {
            notifyFailure(error);
        },
        saved: () => {
            toast.notify({ title: labels('bodySaved'), tone: 'success' });
        },
    };

    return () => {
        fireAndForget(
            saveBody(response, kind).then((outcome) => {
                tellIn(tellers, outcome.state, outcome);
            }),
        );
    };
}
