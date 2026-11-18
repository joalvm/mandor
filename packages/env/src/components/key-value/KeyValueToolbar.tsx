import type { ReactNode } from 'react';

import { KeyValueAutoToggle } from './KeyValueAutoToggle.js';

type KeyValueToolbarProps = {
    title: string;
};

/**
 * The line above the frame of the table: the name of what it holds, and the rows the app adds
 * behind their toggle. The ways to work the rows lie in the head, by the columns they change.
 */
export function KeyValueToolbar({ title }: KeyValueToolbarProps): ReactNode {
    return (
        // band-policy: frame-edge — the name stands on the edge of the frame below it, and the
        // section around the table gives the inset.
        <div className="flex h-control items-center gap-gap-control" data-part="key-value-toolbar">
            <span className="text-xs font-semibold">{title}</span>
            <KeyValueAutoToggle />
        </div>
    );
}
