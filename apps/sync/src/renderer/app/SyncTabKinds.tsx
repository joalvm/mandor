import { FolderTabKind, ItemTabKind } from '@mandor/collections';
import { DocPreviewTabKind, DocTabKind } from '@mandor/docs';
import { registerSettingsSurface } from '@mandor/prefs';
import { ConflictTabKind, OriginsTabKind, switchOriginTo } from '@mandor/repos';
import { EmptyGroup, fireAndForget } from '@mandor/shell';
import { UpdatesStatus } from '@mandor/updates';
import { adoptOrigin, WorkspacesTabKind } from '@mandor/workspace';
import { useLayoutEffect } from 'react';

import { HistoryTabKinds } from '../features/history/index.js';
import {
    LooseRequestTabKind,
    RequestDefaultsSettings,
    RequestExampleTabKind,
    RequestItemKind,
} from '../features/requests/index.js';
import { NoTabOpen } from './NoTabOpen.js';
import { SyncFolderSections } from './SyncFolderSections.js';

/**
 * The kinds of tab Mandor Request draws, written out. A request opens onto its own leaf: the item
 * carries its destination inside, and the panel draws it; one saved nowhere yet has a tab of its
 * own, born from the add of every strip. The history of the sends is a tab of
 * its own.
 *
 * A group with nothing in it has no kind to ask, so what it says is declared once for the window.
 */
export function SyncTabKinds() {
    useLayoutEffect(() => {
        return registerSettingsSurface();
    }, []);

    return (
        <>
            <ConflictTabKind />
            <DocTabKind />
            <DocPreviewTabKind />
            <ItemTabKind />
            <FolderTabKind />
            <SyncFolderSections />
            <RequestItemKind />
            <LooseRequestTabKind />
            <RequestExampleTabKind />
            <HistoryTabKinds />
            <OriginsTabKind
                onSwitch={(id) => {
                    fireAndForget(switchOriginTo(id, { adopt: adoptOrigin }));
                }}
            />
            <WorkspacesTabKind />
            <RequestDefaultsSettings />
            <UpdatesStatus />
            <EmptyGroup>
                <NoTabOpen />
            </EmptyGroup>
        </>
    );
}
