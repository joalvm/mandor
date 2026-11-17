import { folderOfResource, scheduleFolderSettingsWrite, useFolderChain } from '@mandor/env';
import { useFailureToast, useTab } from '@mandor/shell';
import type { ComponentProps } from 'react';

import { EventScripts } from '../scripts/EventScripts.js';
import { RequestImportedScripts } from '../scripts/RequestImportedScripts.js';

/**
 * The scripts of a collection or a folder, in its tab: the same piece a request writes its own
 * with, over the first level of the chain. They run for every request under the group, and the
 * level they are approved at is the one of the group, so a text approved in a folder is not
 * approved in a collection. What an import brought to the group shows under them, as text.
 */
export function FolderScripts() {
    const notifyFailure = useFailureToast();
    const { resource } = useTab();
    const place = folderOfResource(resource);
    const workspaceId = place?.workspaceId ?? null;
    const path = place?.path ?? null;
    const own = useFolderChain(workspaceId, path)[0];

    if (own === undefined || own.level === 'workspace' || workspaceId === null || path === null) {
        return null;
    }

    return (
        <div
            className="flex h-full min-h-0 flex-col gap-gap-control p-pad-panel"
            data-part="folder-scripts"
        >
            <EventScripts
                level={own.level}
                onChange={(scripts) => {
                    // An empty map is not a thing the file keeps: `null` takes the key out.
                    scheduleFolderSettingsWrite(
                        workspaceId,
                        path,
                        { scripts: scripts ?? null },
                        notifyFailure,
                    );
                }}
                resource={resource}
                scripts={own.settings.scripts}
                workspaceId={workspaceId}
            />
            <FolderImportedScripts
                modelKey={resource}
                onChange={({ importedScripts, scripts }) => {
                    // Both lists leave in one patch: the text is never in the two, nor in none.
                    scheduleFolderSettingsWrite(
                        workspaceId,
                        path,
                        { importedScripts: importedScripts ?? null, scripts: scripts ?? null },
                        notifyFailure,
                    );
                }}
                parts={own.settings}
            />
        </div>
    );
}

function FolderImportedScripts(props: ComponentProps<typeof RequestImportedScripts>) {
    if ((props.parts.importedScripts ?? []).length === 0) {
        return null;
    }

    return <RequestImportedScripts {...props} />;
}
