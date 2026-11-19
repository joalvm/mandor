import { TabBody, TabKind } from '@mandor/shell';
import { Card } from '@mandor/ui';

import { ConflictTab } from './components/conflict/ConflictTab.js';
import { conflictDrafts } from './lib/conflict-drafts.js';
import { holdsConflict } from './lib/holds-conflict.js';

/**
 * The tab of a clash, in the app that mounts it. A clash is answered one entity at a time, so
 * the tab is only ever called «Conflicts»: the name of what clashed is the title inside.
 *
 * Closing it by hand with answers on it asks first, and what is asked lives in the drafts: the
 * tab shows the question and the answer comes back through there. Letting go of the tab,
 * however it went, lets go of its answers.
 */
export function ConflictTabKind() {
    return (
        <TabKind
            beforeClose={(tabId) => conflictDrafts.getState().askToLeave(tabId)}
            closable
            holds={holdsConflict}
            icon="warning"
            id="conflict"
            release={(tabId) => {
                conflictDrafts.getState().discard(tabId);
            }}
            title={(_resource, translate) => translate('conflicts:tabTitle')}
        >
            <TabBody>
                <Card>
                    <ConflictTab />
                </Card>
            </TabBody>
        </TabKind>
    );
}
