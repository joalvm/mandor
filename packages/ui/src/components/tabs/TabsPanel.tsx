import { Tabs as TabsPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

import { useOpenSection } from './tabs-scope.js';
import { useOpenedOnce } from './useOpenedOnce.js';

type TabsPanelProps = PropsWithChildren<{
    value: string;
}>;

/**
 * What one section shows. A panel holds an editor, and once it has been open it stays mounted
 * while another is: taking it away would take with it what had been written in it and not sent
 * yet, which is why it hides itself instead of leaving. One that has never been open holds
 * nothing, and is not drawn until it is: an editor nobody looks at is not built.
 */
export function TabsPanel({ children, value }: TabsPanelProps) {
    const open = useOpenSection() === value;
    const opened = useOpenedOnce(open);

    return (
        <TabsPrimitive.Content
            className="min-h-0 min-w-0 flex-1"
            data-part="tabs-section"
            forceMount
            hidden={!open}
            value={value}
        >
            {opened ? children : null}
        </TabsPrimitive.Content>
    );
}
