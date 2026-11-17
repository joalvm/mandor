import type { ItemExamplesLogic } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import type { ErrorCode } from '@mandor/ipc';
import type { HttpResponse, RequestLine } from '@mandor/schema';
import { useFailureToast } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useMemo } from 'react';

import {
    duplicateExample,
    newExample,
    removeExamples,
    renameExample,
} from '../lib/example-operations.js';
import { moveExample } from '../lib/move-example.js';
import { openExample } from '../lib/open-example.js';
import { saveResponseAsExample } from '../lib/save-response-as-example.js';

export type ExampleActions = {
    /** What the tree does with the examples under a request. */
    logic: ItemExamplesLogic;
    newExample: (itemResource: string) => Promise<void>;
    saveResponse: (
        itemResource: string,
        response: HttpResponse,
        query?: RequestLine[],
    ) => Promise<void>;
};

/**
 * The things a person does to the examples of a request, each telling its refusal as a toast and
 * its success when there is something to say. The writes themselves answer a code and say
 * nothing: this is where they meet the window.
 */
export function useExampleActions(): ExampleActions {
    const labels = useMessages('requests');
    const { notify } = useToast();
    const tell = useFailureToast();

    return useMemo(() => {
        function told(run: () => Promise<ErrorCode | null>, saved?: string): Promise<void> {
            return run().then((code) => {
                if (code !== null) {
                    tell(code);

                    return;
                }

                if (saved !== undefined) {
                    notify({ title: saved, tone: 'success' });
                }
            });
        }

        return {
            logic: {
                duplicate: (resource) =>
                    told(() => duplicateExample(resource, labels('copySuffix'))),
                move: (resource, target) => told(() => moveExample(resource, target)),
                open: openExample,
                remove: (resources) => told(() => removeExamples(resources)),
                rename: (resource, name) => told(() => renameExample(resource, name)),
            },
            newExample: (itemResource) =>
                told(() => newExample(itemResource, labels('newExample'))),
            saveResponse: (itemResource, response, query) =>
                told(
                    () => saveResponseAsExample(itemResource, response, query),
                    labels('exampleSaved'),
                ),
        };
    }, [labels, notify, tell]);
}
