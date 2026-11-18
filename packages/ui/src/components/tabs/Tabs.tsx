import { Tabs as TabsPrimitive } from 'radix-ui';
import { useMemo, type PropsWithChildren } from 'react';

import { TabsScopeProvider } from './tabs-scope.js';

type TabsProps = PropsWithChildren<{
    onValueChange: (value: string) => void;
    value: string;
}>;

/**
 * A panel split into sections: the strip on top, the panels under it, written in that order by
 * whoever holds the panel.
 *
 * Which section is open belongs to the holder, never here. What each section contains is a tree
 * the holder writes inside its own `TabsPanel`, so a section can be an editor, a table or a form
 * without this file knowing any of them.
 */
export function Tabs({ children, onValueChange, value }: TabsProps) {
    const scope = useMemo(() => ({ choose: onValueChange, open: value }), [onValueChange, value]);

    return (
        <TabsPrimitive.Root
            className="flex h-full min-h-0 min-w-0 flex-col"
            data-part="tabs"
            onValueChange={onValueChange}
            value={value}
        >
            <TabsScopeProvider value={scope}>{children}</TabsScopeProvider>
        </TabsPrimitive.Root>
    );
}
