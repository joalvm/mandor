import { Card } from '@mandor/ui';
import type { ReactElement, ReactNode } from 'react';

import { useDeclared } from '../../declare/useDeclared.js';
import { EMPTY_GROUP_ID, emptyGroupDeclarations } from '../../grid/empty-group-registry.js';

/**
 * What dockview draws in a group that has no tab in it.
 *
 * A group with nothing in it has no kind to ask, so what it says is of the window: the app
 * declares it once and every group of the window that empties out says the same thing. While no
 * app has declared one the group stays blank rather than inventing words the window never wrote.
 *
 * What it says rests on a card, as the body of a tab does: the group is still the work area,
 * only an empty one, and the frame shows around it the same gutter it shows around a tab.
 */
export function GroupWatermark(): ReactElement {
    const page = useDeclared(emptyGroupDeclarations, EMPTY_GROUP_ID);

    return (
        <div className="flex min-h-0 min-w-0 flex-1 items-stretch" data-part="group-watermark">
            <WatermarkCard>{page?.content}</WatermarkCard>
        </div>
    );
}

/** The card is drawn only around words the window declared: a blank group shows the frame. */
function WatermarkCard({ children }: { children: ReactNode }) {
    if (children === undefined || children === null) {
        return null;
    }

    return <Card>{children}</Card>;
}
