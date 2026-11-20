import { registerCommand, registerSurface, TabBody, TabKind, useTab } from '@mandor/shell';
import { Card } from '@mandor/ui';
import { useEffect } from 'react';

import { syncBridge } from '../../app/sync-bridge.js';
import { HistoryDiffTab } from './components/diff/HistoryDiffTab.js';
import { HistoryTab } from './components/tab/HistoryTab.js';
import { historyStore } from './history-store.js';
import { historyPartsOf } from './lib/history-resource.js';
import { HISTORY_TAB_KIND, openHistory } from './lib/open-history.js';
import { DIFF_TAB_KIND } from './lib/open-comparison.js';

function HistoryBody() {
    const { resource } = useTab();
    const parts = historyPartsOf(resource);

    if (parts?.kind !== 'all') {
        return null;
    }

    return <HistoryTab resource={resource} workspaceId={parts.workspaceId} />;
}

function DiffBody() {
    const parts = historyPartsOf(useTab().resource);

    if (parts?.kind !== 'diff') {
        return null;
    }

    return (
        <Card>
            <HistoryDiffTab ids={parts.ids} workspaceId={parts.workspaceId} />
        </Card>
    );
}

/**
 * What the history is to the window: two tab kinds, the surface the request panel reaches it by,
 * a command for the palette, and the listener that keeps its list current while a send is
 * written. The list is read from disk once per workspace; from then on a push adds a row.
 */
export function HistoryTabKinds() {
    useEffect(() => {
        const stops = [
            registerSurface({ id: HISTORY_TAB_KIND, open: openHistory }),
            registerCommand({
                category: 'commands:categoryWorkspace',
                icon: 'send',
                id: 'history.open',
                run: openHistory,
                title: 'commands:openHistory',
                when: (state) => state.activeWorkspaceId !== null,
            }),
            syncBridge.history.onAppended(({ removed, summary, workspaceId }) => {
                historyStore.getState().append(workspaceId, summary, removed);
            }),
        ];

        return () => {
            for (const stop of stops) {
                stop();
            }
        };
    }, []);

    return (
        <>
            <TabKind
                closable
                icon="send"
                id={HISTORY_TAB_KIND}
                title={(_resource, translate) => translate('history:title')}
            >
                <TabBody>
                    <HistoryBody />
                </TabBody>
            </TabKind>
            <TabKind
                closable
                icon="send"
                id={DIFF_TAB_KIND}
                title={(_resource, translate) => translate('history:diffTitle')}
            >
                <TabBody>
                    <DiffBody />
                </TabBody>
            </TabKind>
        </>
    );
}
