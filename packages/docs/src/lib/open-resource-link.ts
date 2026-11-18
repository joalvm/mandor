import {
    collectionItemPaths,
    formatResourceUri,
    parseResourceUri,
    slugify,
    type ResourceUriParts,
} from '@mandor/schema';
import {
    bridge,
    originName,
    selectGroupOfTab,
    shellStore,
    shownTabId,
    tabKind,
} from '@mandor/shell';

import { openDoc } from './open-doc.js';

/** A resource that lives in a workspace, which is the only kind a link of a doc can name. */
type WorkspaceParts = Extract<ResourceUriParts, { scope: 'workspace' }>;

/**
 * Why a link was left where it was. Each one is a message the reader is shown next to the URI,
 * because a link that quietly does nothing reads as a broken app rather than as a stale doc.
 */
export type LinkRefusal = 'linkInvalid' | 'linkMissing' | 'linkOtherRepo' | 'linkOtherWorkspace';

/**
 * Follows a link of a doc, and answers with the reason it did not. Opening is all it does: what a
 * doc names it shows, and sending, connecting or deleting stay a click of the reader elsewhere.
 * A doc travels with the origin it was written in, so a URI naming another one, another workspace
 * or a file that is no longer there is refused before any tab exists to be blank.
 */
export async function openResourceLink(uri: string, aside: boolean): Promise<LinkRefusal | null> {
    const parts = partsOrNull(uri);

    if (parts === null) {
        return 'linkInvalid';
    }

    if (parts.scope !== 'workspace') {
        return 'linkOtherWorkspace';
    }

    if (parts.repo !== slugify(originName())) {
        return 'linkOtherRepo';
    }

    if (parts.workspace !== shellStore.getState().activeWorkspaceId) {
        return 'linkOtherWorkspace';
    }

    if (!(await onDisk(parts))) {
        return 'linkMissing';
    }

    showResource(parts, aside);

    return null;
}

/** The parts of a URI, or `null` for text that names nothing this window knows how to open. */
function partsOrNull(uri: string): ResourceUriParts | null {
    try {
        return parseResourceUri(uri);
    } catch {
        return null;
    }
}

async function docOnDisk(parts: WorkspaceParts): Promise<boolean> {
    const docs = await bridge.doc.list({ workspaceId: parts.workspace });

    return docs.ok && docs.value.some((doc) => doc.name === parts.path);
}

async function itemOnDisk(parts: WorkspaceParts): Promise<boolean> {
    const tree = await bridge.collections.tree({ workspaceId: parts.workspace });

    return tree.ok && collectionItemPaths(tree.value).includes(parts.path);
}

// Any other kind is an app's, and only the kind it registered knows where its things live.
async function registeredOnDisk(parts: WorkspaceParts): Promise<boolean> {
    return (await tabKind(parts.kind)?.holds?.(parts.workspace, parts.path)) ?? false;
}

/** Where the kinds both apps share keep their things. */
const ON_DISK_OF_KIND: ReadonlyMap<string, (parts: WorkspaceParts) => Promise<boolean>> = new Map([
    ['doc', docOnDisk],
    ['item', itemOnDisk],
]);

/** Asks main whether the resource is still there, by listing: no call changes anything. */
function onDisk(parts: WorkspaceParts): Promise<boolean> {
    return (ON_DISK_OF_KIND.get(parts.kind) ?? registeredOnDisk)(parts);
}

/**
 * Shows the resource, in the group beside the doc unless the reader asked otherwise. Everything
 * the workbench opens is one tab wherever it sits, so the one already open is what comes
 * forward; a doc goes through the same door a row of the list goes through.
 */
function showResource(parts: WorkspaceParts, aside: boolean): void {
    if (parts.kind === 'doc') {
        openDoc(parts.workspace, parts.path, { aside });

        return;
    }

    const shell = shellStore.getState();
    const resource = formatResourceUri(parts);
    const id = shownTabId(parts.kind, resource, parts.path);
    const opened = selectGroupOfTab(shell, id);

    if (opened !== null) {
        shell.setActiveTab(opened, id);
        shell.focusGroup(opened);

        return;
    }

    const tab = { id, kind: parts.kind, resource };

    if (aside) {
        shell.openTabAside(tab);

        return;
    }

    shell.openTab(shell.activeGroupId, tab);
}
