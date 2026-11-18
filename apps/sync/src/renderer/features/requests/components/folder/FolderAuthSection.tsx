import { openFolderTab } from '@mandor/collections';
import {
    AuthEditor,
    envStore,
    folderOfResource,
    scheduleFolderSettingsWrite,
    useFolderChain,
} from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { authChainOf, itemParentOf } from '@mandor/schema';
import { useFailureToast, useTab } from '@mandor/shell';
import { SettingInheritanceLine } from '@mandor/ui';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';

import { useInheritedAuthLabel } from '../../hooks/useInheritedAuthLabel.js';
import { inheritedAuth, rulingFolderOf, type InheritedAuth } from '../../lib/inherited-auth.js';

/**
 * The auth of a collection or a folder, in its tab. It knows its group by the tab it is drawn in
 * and edits the first level of the chain; the levels above say who rules while it inherits.
 */
export function FolderAuthSection(): ReactNode {
    const notifyFailure = useFailureToast();
    const { resource } = useTab();
    const place = folderOfResource(resource);
    const workspaceId = place?.workspaceId ?? null;
    const path = place?.path ?? null;
    const chain = useFolderChain(workspaceId, path);
    const environmentId = useStore(envStore, (state) =>
        workspaceId === null ? null : (state.activeEnvironmentIds[workspaceId] ?? null),
    );
    const owner = inheritedAuth(authChainOf(chain.slice(1)));
    const ownerLabel = useInheritedAuthLabel(owner);
    const own = chain[0];

    if (own === undefined || workspaceId === null || path === null) {
        return null;
    }

    const auth = own.settings.auth;

    return (
        <div
            className="grid min-h-0 content-start gap-gap-group p-pad-panel"
            data-part="folder-auth"
        >
            <AuthEditor
                environment={undefined}
                environmentId={environmentId}
                inheritable
                inheritedLabel={rulingFolderOf(owner) === null ? ownerLabel : undefined}
                onChange={(next) => {
                    scheduleFolderSettingsWrite(
                        workspaceId,
                        path,
                        { auth: next ?? null },
                        notifyFailure,
                    );
                }}
                onVariablesChange={() => undefined}
                parentPath={itemParentOf(path)}
                placements={['header', 'query', 'cookie']}
                value={auth}
            />
            <FolderOwnerLine
                inherits={auth === undefined}
                owner={owner}
                workspaceId={workspaceId}
            />
        </div>
    );
}

type FolderOwnerLineProps = {
    inherits: boolean;
    owner: InheritedAuth | null;
    workspaceId: string;
};

/** The folder that rules while the level inherits, and the way to it; the workspace has no tab. */
function FolderOwnerLine({ inherits, owner, workspaceId }: FolderOwnerLineProps) {
    const labels = useMessages('requests');
    const types = useMessages('auth');

    const ownerPath = rulingFolderOf(owner);

    if (!inherits || owner === null || ownerPath === null) {
        return null;
    }

    return (
        <SettingInheritanceLine
            inheritance={{
                caption: labels('folderAuthInherits', { scheme: types(owner.scheme) }),
                onFollow: () => {
                    openFolderTab(workspaceId, ownerPath, 'auth');
                },
                place: owner.name,
            }}
        />
    );
}
