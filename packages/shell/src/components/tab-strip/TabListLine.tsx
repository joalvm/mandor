import { useMessages } from '@mandor/i18n';
import { Icon, PinnedIcon } from '@mandor/icons';
import { cn, IconButton, ListRow, RowLabel } from '@mandor/ui';

import { useGroupGrid } from '../../grid/group-grid-scope.js';
import { useTabKind } from '../../hooks/useTabKind.js';
import { TabProvider } from '../../tab/tab-context.js';
import type { TabKindSpec } from '../../tab/tab-kind-registry.js';
import type { ListedTab } from '../../tab/tab-list.js';

type TabListCloseProps = { groupId: string; kind: TabKindSpec | undefined; line: ListedTab };

/**
 * Pointed at, the line offers to close its tab without putting it in front: an open tab, unless it
 * is pinned or its kind never closes.
 */
function TabListClose({ groupId, kind, line }: TabListCloseProps) {
    const messages = useMessages('shell');
    const { onCloseTab } = useGroupGrid();

    if (line.closed || line.tab.pinned === true || kind?.closable !== true) {
        return null;
    }

    return (
        <IconButton
            className="opacity-0 group-hover:opacity-100"
            icon="close"
            label={messages('closeTab')}
            onClick={(event) => {
                event.stopPropagation();
                onCloseTab(groupId, line.tab.id);
            }}
            size="xs"
            tabIndex={-1}
        />
    );
}

type TabListLineProps = {
    groupId: string;
    line: ListedTab;
    onChoose: (line: ListedTab) => void;
    selected: boolean;
};

/**
 * A tab as the list of the group says it: the mark of its kind, its name —slanted while it is
 * only being looked at, as on the strip— the pin, and what the kind says about it at rest, the
 * state of a socket or work not saved yet. An open tab that can close offers it when pointed at.
 */
export function TabListLine({ groupId, line, onChoose, selected }: TabListLineProps) {
    const kind = useTabKind(line.tab.kind);
    const { tab } = line;

    return (
        <TabProvider value={{ resource: tab.resource, tabId: tab.id }}>
            <ListRow
                onSelect={() => {
                    onChoose(line);
                }}
                selected={selected}
                tabIndex={-1}
            >
                <Icon name={kind?.icon ?? 'file'} />
                <RowLabel className={cn(tab.preview === true && 'italic')}>{line.title}</RowLabel>
                <TabListPin pinned={tab.pinned} />
                {line.closed ? null : kind?.status}
                <TabListClose groupId={groupId} kind={kind} line={line} />
            </ListRow>
        </TabProvider>
    );
}

function TabListPin({ pinned }: { pinned: boolean | undefined }) {
    if (pinned !== true) {
        return null;
    }

    return <PinnedIcon size="sm" />;
}
