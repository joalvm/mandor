import { useEditorIssueMessage, useMessages } from '@mandor/i18n';
import type { HttpResponse, RequestExample } from '@mandor/schema';
import { fireAndForget, useFailureToast, useKeepTab } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { withSchemaChecker } from '@mandor/validate';

import { syncBridge } from '../../../app/sync-bridge.js';
import { acceptedExample } from '../lib/compare/accept-received.js';
import { firstViolation } from '../lib/compare/first-violation.js';
import { editExample } from '../lib/example-draft-write.js';
import type { SendEntry } from '../responses.slice.js';

type ReviewOptions = {
    /** Called when the answer was taken and the schema still refuses a value of it. */
    onSchemaLeft?: (() => void) | undefined;
    /** The schema the answer is set against, as the tab shows it. */
    schema?: string | undefined;
};

export type ExampleReview = {
    /** Takes the answer received as the answer the example expects. */
    accept: () => void;
};

/**
 * What a person does with the difference an example shows: take what came, all of it, with every
 * secret hidden by main first; if main refuses, the example stays as it was. It is an edit of the
 * example, kept as a draft until it is saved.
 */
export function useExampleReview(
    resource: string,
    example: RequestExample | undefined,
    entry: SendEntry,
    options: ReviewOptions = {},
): ExampleReview {
    const labels = useMessages('requests');
    const say = useEditorIssueMessage();
    const { notify } = useToast();
    const tell = useFailureToast();
    const keep = useKeepTab();

    function edit(next: (current: RequestExample) => RequestExample): void {
        if (example === undefined) {
            return;
        }

        // An edited example is no longer a look the next click replaces.
        keep();
        editExample(resource, next(example));
    }

    async function take(received: HttpResponse): Promise<void> {
        const hidden = await syncBridge.request.hideSecrets(received);

        if (!hidden.ok) {
            tell(hidden.error.code);

            return;
        }

        edit((current) => acceptedExample(current, hidden.value));

        withSchemaChecker(() => {
            const left = firstViolation(options.schema, hidden.value);

            if (left !== undefined) {
                options.onSchemaLeft?.();
            }

            notify({
                detail:
                    left === undefined
                        ? labels('exampleAcceptedDetail')
                        : labels('exampleAcceptedSchemaDetail', {
                              path: left.path,
                              rule: say(left.rule.message, left.rule),
                          }),
                title: labels(left === undefined ? 'exampleAccepted' : 'exampleAcceptedSchema'),
                tone: left === undefined ? 'success' : 'warning',
            });
        });
    }

    return {
        accept: () => {
            if (entry.state === 'done') {
                fireAndForget(take(entry.response));
            }
        },
    };
}
