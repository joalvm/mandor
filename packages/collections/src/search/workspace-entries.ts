import type { Translator } from '@mandor/i18n';
import { originName, shellStore, type SearchEntry, type WorkspaceEntries } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';
import { folderEntries } from './folder-entries.js';
import { itemEntries } from './item-entries.js';

/**
 * Every entry of the open workspace: its groups, its items and what each source brings. None
 * without one.
 */
export function workspaceEntries(
    sources: readonly WorkspaceEntries[],
    translate: Translator,
): SearchEntry[] {
    const workspaceId = shellStore.getState().activeWorkspaceId;

    if (workspaceId === null) {
        return [];
    }

    const origin = originName();

    const { nodes } = collectionStore.getState();

    return [
        ...folderEntries(nodes, origin, workspaceId),
        ...itemEntries(nodes, origin, workspaceId),
        ...sources.flatMap((source) => source(origin, workspaceId, translate)),
    ];
}
