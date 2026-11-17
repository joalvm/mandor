import type { PropsWithChildren } from 'react';

type TabsStripProps = PropsWithChildren;

/**
 * The band over the panels. The sections travel in a `TabsList`; what applies to the whole panel
 * stands beside it, outside the list, because a button is not a section and a strip that held it
 * inside would offer it to the arrow keys as if it were one.
 */
export function TabsStrip({ children }: TabsStripProps) {
    return (
        <div
            className="flex h-header shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="tabs-strip"
        >
            {children}
        </div>
    );
}
