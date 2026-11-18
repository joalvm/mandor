import type { IDockviewPanelHeaderProps } from 'dockview';
import { memo, useEffect, useRef, useState } from 'react';

import type { TabParams } from '../../grid/dockview-layout.js';
import { useGroupGrid } from '../../grid/group-grid-scope.js';
import { isPinnedTab } from '../../grid/leaf-pins.js';
import { isPreviewTab } from '../../grid/leaf-preview.js';
import { useShellStore } from '../../hooks/useShellStore.js';
import { useTabKind } from '../../hooks/useTabKind.js';
import { useTabTitle } from '../../hooks/useTabTitle.js';
import { useTabTrail } from '../../hooks/useTabTrail.js';
import { shellStore } from '../../shell-store.js';
import { TabProvider } from '../../tab/tab-context.js';
import type { TabKindSpec } from '../../tab/tab-kind-registry.js';
import { TabHead } from '../tab-strip/TabHead.js';
import { TabMenu } from '../tab-strip/TabMenu.js';
import { TabTrailing } from '../tab-strip/TabTrailing.js';
import { useTabWrapper } from './useTabWrapper.js';
import { useTrailingAction } from './useTrailingAction.js';

type GroupTabProps = IDockviewPanelHeaderProps<TabParams>;

/**
 * One tab of a group. Selection is a filled shape and not a line under the title, and which
 * shape it takes is the stylesheet's decision: the view already says which tab of which group is
 * the one in front, and saying it twice would leave the two able to disagree.
 *
 * Memoized: dockview draws every header again when any panel of the group moves, and a tab only
 * changes when its own panel, its kind or the grid around it do. Whether it is only being looked
 * at is read from the store for this tab alone: keeping one tab redraws that tab and no other,
 * and the layout dockview builds from never changes for it.
 */
export const GroupTab = memo(function GroupTab({ api, params }: GroupTabProps) {
    const kind = useTabKind(params.kind);

    if (kind === undefined) {
        return null;
    }

    return <DeclaredGroupTab api={api} kind={kind} params={params} />;
});

type DeclaredGroupTabProps = Pick<GroupTabProps, 'api' | 'params'> & { kind: TabKindSpec };

function DeclaredGroupTab({ api, kind, params }: DeclaredGroupTabProps) {
    const { onCloseTab, resources } = useGroupGrid();
    const title = useTabTitle(kind, params.resource);
    const trail = useTabTrail(kind, params.resource);
    const missing = resources[params.resource]?.missing === true;
    const preview = useShellStore((state) => isPreviewTab(state.grid, api.id));
    const pinned = useShellStore((state) => isPinnedTab(state.grid, api.id));
    const [active, setActive] = useState(api.isActive);
    const pill = useRef<HTMLSpanElement>(null);
    const closable = kind.closable || missing;
    const action = useTrailingAction({
        closable,
        groupId: api.group.id,
        pinned,
        tabId: api.id,
    });

    useTabWrapper(pill, active);

    useEffect(() => {
        const subscription = api.onDidActiveChange((event) => {
            setActive(event.isActive);
        });

        return () => {
            subscription.dispose();
        };
    }, [api]);

    /**
     * The element dockview draws around this tab carries the accessible name, and it only hears
     * a new one through the panel: a rename that never reaches `setTitle` leaves the window
     * announcing the name the tab was born with.
     */
    useEffect(() => {
        if (api.title !== title) {
            api.setTitle(title);
        }
    }, [api, title]);

    return (
        <TabProvider value={{ resource: params.resource, tabId: api.id }}>
            <TabMenu groupId={api.group.id} tabId={api.id}>
                {/* markup-policy: pointer-shortcut — double click keeps, middle button closes what is not pinned; keys: tab.keepOpen, tab.close. */}
                <span
                    className="group relative flex h-full w-full min-w-0 items-center justify-center-safe gap-gap-icon-text px-pad-control"
                    data-missing={missing ? '' : undefined}
                    data-part="group-tab"
                    data-pinned={pinned ? '' : undefined}
                    data-preview={preview ? '' : undefined}
                    onAuxClick={(event) => {
                        if (event.button === 1 && closable && !pinned) {
                            onCloseTab(api.group.id, api.id);
                        }
                    }}
                    onDoubleClick={() => {
                        shellStore.getState().keepTab(api.id);
                    }}
                    onMouseDown={(event) => {
                        // The middle button would start the scroll of the window under the pointer.
                        if (event.button === 1) {
                            event.preventDefault();
                        }
                    }}
                    ref={pill}
                >
                    {kind.indicator}
                    <TabHead missing={missing} title={title} trail={trail} />
                    <TabTrailing action={action}>{kind.status}</TabTrailing>
                </span>
            </TabMenu>
        </TabProvider>
    );
}
