import { Tabs as TabsPrimitive } from 'radix-ui';
import { Children, useRef, type PropsWithChildren } from 'react';

import { TabsOverflow } from './TabsOverflow.js';
import { useChooseSection, useOpenSection } from './tabs-scope.js';
import { useTabsFit } from './useTabsFit.js';

type TabsListProps = PropsWithChildren<{
    label: string;
}>;

/**
 * The sections of the strip, side by side, and the only thing the arrow keys walk. Those that do
 * not fit stay in the list, out of view, for the keys and for whoever reads the strip aloud, and
 * the menu after the list offers them; the open one is always in view.
 */
export function TabsList({ children, label }: TabsListProps) {
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
