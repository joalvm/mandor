import type { RequestExample } from '@mandor/schema';
import { useSchemaChecker } from '@mandor/ui';
import { useMemo } from 'react';
import { useStore } from 'zustand';

import { compareExample, type ExampleComparison } from '../lib/compare/compare-example.js';
import { statusMatches } from '../lib/compare/compare-status.js';
import { requestsStore } from '../requests-store.js';
import { IDLE_SEND, type SendEntry } from '../responses.slice.js';

type ExampleComparisonView = {
    /** Set against the example as it is now, so an edit compares again at once. `undefined` until a send came. */
    comparison: ExampleComparison | undefined;
    entry: SendEntry;
};

/**
 * Where the last send of an example stands and how its answer differs from the example. Its
 * schema judges an answer of its status, and only that: another status is a difference already.
 * An example that is not there, because the file changed under the window, compares to nothing.
 */
export function useExampleComparison(
    resource: string,
    example: RequestExample | undefined,
): ExampleComparisonView {
    const entry = useStore(requestsStore, (state) => state.sends[resource] ?? IDLE_SEND);
    const checked = useSchemaChecker();
    const comparison = useMemo(
        () =>
            entry.state === 'done' && example !== undefined
                ? compareExample(
                      example,
                      entry.response,
                      checked && statusMatches(example.status, entry.response.status)
                          ? example.schema
                          : undefined,
                  )
                : undefined,
        [checked, example, entry],
    );

    return { comparison, entry };
}
