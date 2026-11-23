import { ScriptsByEvent } from '@mandor/collections';
import {
    folderOfResource,
    ItemPlaceContext,
    scheduleFolderSettingsWrite,
    useFolderChain,
} from '@mandor/env';
import { REQUEST_SCRIPT_EVENTS, type FolderChainLevel } from '@mandor/schema';
import { useFailureToast, useTab } from '@mandor/shell';

import { useFolderScriptContext } from '../../hooks/useFolderScriptContext.js';

/**
 * The scripts of a collection or a folder, in its tab: the same piece a request writes its own
 * with, over the first level of the chain. They run for every request under the group, and the
 * level they are approved at is the one of the group, so a text approved in a folder is not
 * approved in a collection. What an import brought to the group is there, in its moment, not
 * yet approved.
 */
export function FolderScripts() {
    const { resource } = useTab();
    const place = folderOfResource(resource);
    const workspaceId = place?.workspaceId ?? null;
    const path = place?.path ?? null;
    const own = useFolderChain(workspaceId, path)[0];

    if (own === undefined || own.level === 'workspace' || workspaceId === null || path === null) {
        return null;
    }

    return (
        <ItemPlaceContext value={path}>
            <GroupScripts
                level={own.level}
                path={path}
                resource={resource}
                scripts={own.settings.scripts}
                workspaceId={workspaceId}
            />
        </ItemPlaceContext>
    );
}

type GroupScriptsProps = {
    level: 'collection' | 'folder';
    path: string;
    resource: string;
    scripts: FolderChainLevel['settings']['scripts'];
    workspaceId: string;
};

/** The scripts of the group, read under its place: what they complete with is the group's. */
function GroupScripts({ level, path, resource, scripts, workspaceId }: GroupScriptsProps) {
    const notifyFailure = useFailureToast();
    const context = useFolderScriptContext(workspaceId, path);

    return (
        <div
            className="flex h-full min-h-0 flex-col gap-gap-control p-pad-panel"
            data-part="folder-scripts"
        >
            <ScriptsByEvent
                context={context}
                events={REQUEST_SCRIPT_EVENTS}
                onChange={(next) => {
                    // An empty map is not a thing the file keeps: `null` takes the key out.
                    scheduleFolderSettingsWrite(
                        workspaceId,
                        path,
                        { scripts: next ?? null },
                        notifyFailure,
                    );
                }}
                place={{ level, workspaceId }}
                resource={resource}
                scripts={scripts}
            />
        </div>
    );
}
