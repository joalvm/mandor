import { ScriptsByEvent } from '@mandor/collections';
import { folderOfResource, scheduleFolderSettingsWrite, useFolderChain } from '@mandor/env';
import { REQUEST_SCRIPT_EVENTS } from '@mandor/schema';
import { useFailureToast, useTab } from '@mandor/shell';

/**
 * The scripts of a collection or a folder, in its tab: the same piece a request writes its own
 * with, over the first level of the chain. They run for every request under the group, and the
 * level they are approved at is the one of the group, so a text approved in a folder is not
 * approved in a collection. What an import brought to the group is there, in its moment, not
 * yet approved.
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
            <ScriptsByEvent
                events={REQUEST_SCRIPT_EVENTS}
                onChange={(scripts) => {
                    // An empty map is not a thing the file keeps: `null` takes the key out.
                    scheduleFolderSettingsWrite(
                        workspaceId,
                        path,
                        { scripts: scripts ?? null },
                        notifyFailure,
                    );
                }}
                place={{ level: own.level, workspaceId }}
                resource={resource}
                scripts={own.settings.scripts}
            />
        </div>
    );
}
