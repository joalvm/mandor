import { ROOT_GROUP_ID } from '@mandor/ipc';
import { useMemo, useState, type ComponentProps, type PropsWithChildren } from 'react';

import { GroupTab } from '../components/group-grid/GroupTab.js';
import { GroupGridContext } from '../grid/group-grid-scope.js';
import type { ResourceIndex } from '../resource/resource-index.js';
import { TabStripContext } from '../tab/tab-strip-context.js';
import type { Tab } from '../tab/tab.js';

type TabStripOfProps = PropsWithChildren<{ groupId: string }>;

/**
 * The strip of a group without the grid: what an action reaches with `useTabStrip`, for a test
 * that draws the action alone.
 */
export function TabStripOf({ children, groupId }: TabStripOfProps) {
    return <TabStripContext value={{ groupId }}>{children}</TabStripContext>;
}

type GroupTabProps = ComponentProps<typeof GroupTab>;

type TabOfProps = {
    active?: boolean;
    groupId?: string;
    onClose?: (groupId: string, tabId: string) => void;
    resources?: ResourceIndex;
    tab: Tab;
};

function noClose(): void {
    // A test that never asks the tab to close has nothing to hear.
}

/**
 * One tab of a group without the grid: the pill a kind draws in the strip, with the panel dockview
 * would hand it reduced to what the pill reads, inside the wrapper dockview draws around it, which
 * is the tab the window announces by the name the pill hands it. For a test of what a kind says
 * on its tab.
 */
export function TabOf({
    active = true,
    groupId = ROOT_GROUP_ID,
    onClose = noClose,
    resources = {},
    tab,
}: TabOfProps) {
    const [title, setTitle] = useState('');
    const api = useMemo(() => {
        const panel = {
            group: { id: groupId },
            id: tab.id,
            isActive: active,
            onDidActiveChange: () => ({ dispose: () => undefined }),
            setTitle: (next: string) => {
                panel.title = next;
                setTitle(next);
            },
            title: '',
        };

        return panel as unknown as GroupTabProps['api'];
    }, [active, groupId, tab.id]);

    return (
        <GroupGridContext value={{ onCloseTab: onClose, resources }}>
            <div aria-label={title} className="dv-tab" role="tab">
                <GroupTab
                    api={api}
                    containerApi={{} as GroupTabProps['containerApi']}
                    params={{ kind: tab.kind, resource: tab.resource }}
                    tabLocation="header"
                />
            </div>
        </GroupGridContext>
    );
}
