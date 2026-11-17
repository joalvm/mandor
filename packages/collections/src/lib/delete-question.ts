import type { useMessages } from '@mandor/i18n';

import type { Doomed } from './split-deleting.js';

type Messages = ReturnType<typeof useMessages<'collections'>>;

/**
 * One entry is named, so the person reads what goes; many are counted, since a list is not read.
 * Examples alone are counted as examples, and anything mixed with nodes as entries.
 */
export function deleteQuestion(doomed: Doomed, messages: Messages): string {
    const [node] = doomed.nodes;
    const [example] = doomed.examples;
    const count = doomed.nodes.length + doomed.examples.length;

    if (count === 1 && node !== undefined) {
        return messages('deleteBody', { name: node.name });
    }

    if (count === 1 && example !== undefined) {
        return messages('deleteExampleBody', { name: example.example.name });
    }

    if (doomed.nodes.length === 0) {
        return messages('deleteManyExamplesBody', { count });
    }

    return messages('deleteManyBody', { count });
}
