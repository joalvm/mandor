import type { PropsWithChildren } from 'react';

import { useTabsOrientation, type TabsOrientation } from './tabs-scope.js';

type TabsStripProps = PropsWithChildren;

/** Over the panels the strip is a band; beside them, in a column, there is no band to draw. */
const STRIP_OF = {
    horizontal: StripBand,
    vertical: NoBand,
} satisfies Record<TabsOrientation, (props: TabsStripProps) => unknown>;

/**
 * The band over the panels. The sections travel in a `TabsList`; what applies to the whole panel
 * stands beside it, outside the list, because a button is not a section and a strip that held it
 * inside would offer it to the arrow keys as if it were one. Sections that stand in a column
 * beside their panels have no band over them: what the strip holds stands as it is.
 */
export function TabsStrip(props: TabsStripProps) {
    const Strip = STRIP_OF[useTabsOrientation()];

    return <Strip {...props} />;
}

function StripBand({ children }: TabsStripProps) {
    return (
        <div
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="tabs-strip"
        >
            {children}
        </div>
    );
}

function NoBand({ children }: TabsStripProps) {
    return children;
}
