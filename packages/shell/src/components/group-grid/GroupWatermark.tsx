import type { ReactElement } from 'react';

import { useDeclared } from '../../declare/useDeclared.js';
import { EMPTY_GROUP_ID, emptyGroupDeclarations } from '../../grid/empty-group-registry.js';

/**
 * What dockview draws in a group that has no tab in it.
 *
 * A group with nothing in it has no kind to ask, so what it says is of the window: the app
 * declares it once and every group of the window that empties out says the same thing. While no
 * app has declared one the group stays blank rather than inventing words the window never wrote.
 */
export function GroupWatermark(): ReactElement {
    const page = useDeclared(emptyGroupDeclarations, EMPTY_GROUP_ID);

    return (
        <div className="flex min-h-0 min-w-0 flex-1 items-stretch" data-part="group-watermark">
            {page?.content}
        </div>
    );
}
