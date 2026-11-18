import { parseResourceUri } from '@mandor/schema';
import { shellStore, shownTabId, tabKind } from '@mandor/shell';

import { collectionStore } from '../collection-store.js';
import { itemLeaf } from '../item-leaf-registry.js';
import { nodeAt } from '../lib/node-at.js';

import type { SearchHit } from './search-workspace.js';

type OpenEnvironment = (workspaceId: string, environmentId: string) => void;

/**
 * The one way a hit opens. A hit stays listed even when this window has no way to draw it: found
 * is not the same as opened. An environment has no tab — a variable neither — and both land in
 * the dialog of environments of the workspace they belong to.
 */
export function openSearchHit(
    hit: SearchHit,
    aside: boolean,
    openEnvironment: OpenEnvironment,
): void {
    const parts = parseResourceUri(hit.resource);

    if (parts.scope !== 'workspace') {
        return;
    }

    if (parts.kind === 'environment') {
        openEnvironment(parts.workspace, parts.path);

        return;
    }

    if (tabKind(parts.kind) === undefined) {
        return;
    }

    // The tab kind of an item is one for every kind of item; whoever claims the item is
    // found by the kind the collection gave the node, which is what the leaf registered under.
    const node = nodeAt(collectionStore.getState().nodes, parts.path);

    if (node?.kind === 'item' && itemLeaf(node.itemKind)?.open?.(hit.resource) === true) {
        return;
    }

    const shell = shellStore.getState();
    const id = shownTabId(
        parts.kind,
        hit.resource,
        `${parts.kind}-${parts.workspace}-${parts.path}`,
    );
    const tab = { id, kind: parts.kind, resource: hit.resource };

    if (aside) {
        shell.openTabAside(tab);

        return;
    }

    shell.openTab(shell.activeGroupId, tab);
}
