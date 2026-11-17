import { useMessages } from '@mandor/i18n';
import { IconButton, Popover, PopoverPanel, PopoverTrigger } from '@mandor/ui';
import type { DockviewGroupPanel } from 'dockview';

import { useShellStore } from '../../hooks/useShellStore.js';
import { shellStore } from '../../shell-store.js';
import { TabListPanel } from './TabListPanel.js';

type TabListMenuProps = { group: DockviewGroupPanel };

/**
 * The button at the far end of the strip and the list it opens: every tab of the group, found by
 * name however many there are, and what left the window lately. Which group has its list open is
 * the window's to say, so the keys can open it on the group that holds the focus.
 */
export function TabListMenu({ group }: TabListMenuProps) {
    const messages = useMessages('shell');
    const open = useShellStore((state) => state.listingGroupId === group.id);

    function listing(next: boolean): void {
        shellStore.getState().setListingGroup(next ? group.id : null);
    }

    return (
        <Popover onOpenChange={listing} open={open}>
            <PopoverTrigger>
                <IconButton
                    icon="chevron-down"
                    iconSize="sm"
                    label={messages('listTabs')}
                    size="xs"
                />
            </PopoverTrigger>
            <PopoverPanel label={messages('listTabs')}>
                <TabListPanel
                    groupId={group.id}
                    onDone={() => {
                        listing(false);
                    }}
                />
            </PopoverPanel>
        </Popover>
    );
}
