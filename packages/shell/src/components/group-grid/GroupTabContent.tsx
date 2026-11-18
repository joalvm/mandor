import type { IDockviewPanelProps } from 'dockview';

import type { TabParams } from '../../grid/dockview-layout.js';
import { useGroupGrid } from '../../grid/group-grid-scope.js';
import { useTabKind } from '../../hooks/useTabKind.js';
import { TabProvider } from '../../tab/tab-context.js';
import { FaultBoundary } from '../fault/FaultBoundary.js';

/**
 * What a group shows: whatever the kind of its tab in front draws. The view mounts one of these
 * per group and no more, so a window with twenty tabs open is still three editors on screen.
 *
 * A tab that throws while it draws is left as a state of failure and takes nothing else with it;
 * it draws again when the resource it shows changes. The tab reads itself with `useTab`.
 */
export function GroupTabContent({ api, params }: IDockviewPanelProps<TabParams>) {
    const { onCloseTab } = useGroupGrid();
    const kind = useTabKind(params.kind);

    return (
        <FaultBoundary
            onClose={() => {
                onCloseTab(api.group.id, api.id);
            }}
            resetKeys={[params.resource]}
            scope="tab"
        >
            <TabProvider value={{ resource: params.resource, tabId: api.id }}>
                {kind?.body}
            </TabProvider>
        </FaultBoundary>
    );
}
