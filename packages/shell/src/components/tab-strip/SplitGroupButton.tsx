import { useMessages } from '@mandor/i18n';
import { IconButton } from '@mandor/ui';
import type { DockviewGroupPanel } from 'dockview';

import { shellStore } from '../../shell-store.js';

/** Only the group's id: the rest of the group is dockview's. */
type SplitGroupButtonProps = { group: Pick<DockviewGroupPanel, 'id'> };

/**
 * The split at the far end of the strip, beside the list of its tabs: the command of the palette
 * for the group it is drawn on, whichever group holds the focus.
 */
export function SplitGroupButton({ group }: SplitGroupButtonProps) {
    const messages = useMessages('commands');

    return (
        <IconButton
            icon="split-horizontal"
            iconSize="sm"
            label={messages('splitRight')}
            onClick={() => {
                shellStore.getState().splitGroup(group.id, 'row');
            }}
            size="xs"
        />
    );
}
