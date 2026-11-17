import { LoadingIcon } from '@mandor/icons';

import type { ExampleComparison } from '../../lib/compare/compare-example.js';
import type { SendEntry } from '../../responses.slice.js';

type ExampleDiffMarkProps = {
    comparison: ExampleComparison | undefined;
    entry: SendEntry;
};

/**
 * What the Differences tab says from the strip: a spinner while the example is on its way, the
 * count of what differs once it came back, and nothing when there is nothing to say.
 */
export function ExampleDiffMark({ comparison, entry }: ExampleDiffMarkProps) {
    if (entry.state === 'sending') {
        return (
            <span
                className="flex size-icon-md items-center justify-center"
                data-part="example-diff-mark"
                data-spin=""
            >
                <LoadingIcon size="sm" />
            </span>
        );
    }

    if (comparison === undefined || comparison.count === 0) {
        return null;
    }

    return (
        <span
            className="rounded-sm bg-surface-error-tint px-1 text-xs tabular-nums text-text-error"
            data-part="example-diff-mark"
        >
            {comparison.count}
        </span>
    );
}
