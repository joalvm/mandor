import { Tabs as TabsPrimitive } from 'radix-ui';
import { useMemo, type PropsWithChildren } from 'react';

import { TabsScopeProvider, type TabsOrientation } from './tabs-scope.js';

type TabsProps = PropsWithChildren<{
    onValueChange: (value: string) => void;
    /** Side by side over the panels (the default), or in a column beside them. */
    orientation?: TabsOrientation | undefined;
    value: string;
}>;

/** The list goes over the panels in a strip, or beside them in a column. */
const ROOT_OF: Readonly<Record<TabsOrientation, string>> = {
    horizontal: 'flex h-full min-h-0 min-w-0 flex-col',
    vertical: 'flex h-full min-h-0 min-w-0 flex-row gap-gap-control',
};

/**
 * A panel split into sections: the strip on top, the panels under it, written in that order by
 * whoever holds the panel.
 *
 * Which section is open belongs to the holder, never here. What each section contains is a tree
 * the holder writes inside its own `TabsPanel`, so a section can be an editor, a table or a form
 * without this file knowing any of them.
 *
 * Standing in a column, the sections are walked with the arrows up and down, and the list says so
 * to whoever reads it aloud.
 */
export function Tabs({ children, onValueChange, orientation = 'horizontal', value }: TabsProps) {
    const scope = useMemo(
        () => ({ choose: onValueChange, open: value, orientation }),
        [onValueChange, orientation, value],
    );

    return (
        <TabsPrimitive.Root
            className={ROOT_OF[orientation]}
            data-orientation={orientation}
            data-part="tabs"
            onValueChange={onValueChange}
            orientation={orientation}
            value={value}
        >
            <TabsScopeProvider value={scope}>{children}</TabsScopeProvider>
        </TabsPrimitive.Root>
    );
}
