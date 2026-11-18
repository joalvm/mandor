import { examplePartsOf, exampleItemOf } from '@mandor/collections';
import type { RequestExample, RequestItem } from '@mandor/schema';
import { useStore } from 'zustand';

import { exampleAt } from '../lib/example-draft-write.js';
import { requestsStore } from '../requests-store.js';

import { useRequest } from './useRequest.js';

/** An example as its tab shows it: the request it hangs from, what is on the file and what is typed. */
export type ExampleView = {
    example: RequestExample;
    item: string;
    key: string;
    parent: RequestItem;
    saved: RequestExample;
};

/**
 * The example behind one resource, with the request that holds it, read the first time somebody
 * looks. What is typed goes in front of what the file says. A request or an example that is not
 * there — the file changed under the window — answers nothing, and the tab stays empty.
 */
export function useExample(resource: string): ExampleView | undefined {
    const parts = examplePartsOf(resource);
    const item = exampleItemOf(resource);
    const parent = useRequest(item ?? resource);
    const draft = useStore(requestsStore, (state) => state.exampleDrafts[resource]);

    if (parts === null || item === null || parent === undefined) {
        return undefined;
    }

    const saved = exampleAt(parent, parts.key);

    if (saved === undefined) {
        return undefined;
    }

    return { example: draft?.example ?? saved, item, key: parts.key, parent, saved };
}
