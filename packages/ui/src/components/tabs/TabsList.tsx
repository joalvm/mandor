import { Tabs as TabsPrimitive } from 'radix-ui';
import { Children, useRef, type PropsWithChildren } from 'react';

import { TabsOverflow } from './TabsOverflow.js';
import { useChooseSection, useOpenSection, useTabsOrientation } from './tabs-scope.js';
import { useTabsFit } from './useTabsFit.js';

type TabsListProps = PropsWithChildren<{
    label: string;
}>;

/**
 * The sections of the strip, and the only thing the arrow keys walk. Side by side, those that do
 * not fit stay in the list, out of view, for the keys and for whoever reads the strip aloud, and
 * the menu after the list offers them; the open one is always in view. In a column, each stands
 * under the one before, as wide as the longest name.
 */
export function TabsList(props: TabsListProps) {
    if (useTabsOrientation() === 'vertical') {
        return <TabsColumn {...props} />;
    }

    return <TabsRow {...props} />;
}

/** The sections side by side, the ones that do not fit offered by the menu after them. */
function TabsRow({ children, label }: TabsListProps) {
    const list = useRef<HTMLDivElement>(null);
    const hidden = useTabsFit(list, useOpenSection(), Children.count(children));
    const choose = useChooseSection();

    return (
        <>
            <TabsPrimitive.List
                aria-label={label}
                className="relative flex min-w-0 flex-1 items-center gap-gap-tight overflow-hidden"
                data-part="tabs-list"
                ref={list}
            >
                {children}
            </TabsPrimitive.List>
            <TabsOverflow hidden={hidden} label={label} onChoose={choose} />
        </>
    );
}

/**
 * The sections one under another, as wide as the longest name and never wrapped: a name longer
 * than the room the column has is cut where it ends.
 */
function TabsColumn({ children, label }: TabsListProps) {
    return (
        <TabsPrimitive.List
            aria-label={label}
            className="flex w-max max-w-60 shrink-0 flex-col gap-gap-tight"
            data-part="tabs-list"
        >
            {children}
        </TabsPrimitive.List>
    );
}
