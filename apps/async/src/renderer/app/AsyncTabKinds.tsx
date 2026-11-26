import { FolderTabKind, ItemTabKind } from '@mandor/collections';
import { DocPreviewTabKind, DocTabKind } from '@mandor/docs';
import { registerSettingsSurface } from '@mandor/prefs';
import { ConflictTabKind, OriginsTabKind } from '@mandor/repos';
import { fireAndForget } from '@mandor/shell';
import { UpdatesStatus } from '@mandor/updates';
import { WorkspacesTabKind } from '@mandor/workspace';
import { useLayoutEffect } from 'react';

import { ActivitySettings } from '../activity/ActivitySettings.js';
import { ConnectionDefaultsSettings, ConnectionTabKind } from '../features/connections/index.js';
import { MessageItemKind, registerMessageSchemas } from '../features/messages/index.js';
import { switchAsyncOriginTo } from './switch-origin.js';
import { AsyncFolderSections } from './AsyncFolderSections.js';

/**
 * The kinds of tab Mandor Realtime draws, written out. The item kind draws whatever the leaves
 * know, so the leaves of Async are declared with it, before any tab is restored.
 */
export function AsyncTabKinds() {
    useLayoutEffect(() => {
        const stops = [registerMessageSchemas(), registerSettingsSurface()];

        return () => {
            for (const stop of stops) {
                stop();
            }
        };
    }, []);

    return (
        <>
            <ConnectionTabKind />
            <ConflictTabKind />
            <DocTabKind />
            <DocPreviewTabKind />
            <ItemTabKind />
            <FolderTabKind />
            <AsyncFolderSections />
            <MessageItemKind />
            <OriginsTabKind
                onSwitch={(id) => {
                    fireAndForget(switchAsyncOriginTo(id));
                }}
            />
            <WorkspacesTabKind />
            <ConnectionDefaultsSettings />
            <ActivitySettings />
            <UpdatesStatus />
        </>
    );
}
