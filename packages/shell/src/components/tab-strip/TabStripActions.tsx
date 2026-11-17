import { Fragment, type ReactElement } from 'react';
import type { DockviewGroupPanel } from 'dockview';

import { useDeclaredList } from '../../declare/useDeclared.js';
import { tabStripActionDeclarations } from '../../tab/tab-strip-action-registry.js';
import { TabStripContext } from '../../tab/tab-strip-context.js';

type TabStripActionsProps = { group: DockviewGroupPanel };

/**
 * The slot dockview puts right after the tabs of the group, wherever the strip ends: the add of
 * a connections strip sits beside the last tab, the way every strip of tabs in the product does.
 * It stays when the last tab goes, because a strip with no tabs is where the next one is born.
 * Each action reads the group it is drawn in with `useTabStrip`.
 */
export function TabStripActions({ group }: TabStripActionsProps): ReactElement {
    const actions = useDeclaredList(tabStripActionDeclarations);

    return (
        <TabStripContext value={{ groupId: group.id }}>
            {actions.map((action) => (
                <Fragment key={action.id}>{action.content}</Fragment>
            ))}
        </TabStripContext>
    );
}
