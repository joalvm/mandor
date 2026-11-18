import type {
    AuthConfig,
    CollectionItem,
    CollectionNode,
    ConcreteAuth,
    FolderSettings,
} from '@mandor/schema';
import type {
    WorkspaceCollectionSource,
    WorkspaceData,
    WorkspaceDoc,
    WorkspaceFolderNode,
    WorkspaceFolderSettings,
} from '@mandor/interop-core';
import {
    listConnections,
    listDocs,
    listEnvironments,
    readFolderSettings,
    readGlobals,
    readCollectionTree,
    readDoc,
    readItem,
    readWorkspace,
} from '@mandor/store-fs';

/**
 * The workspace as the codec wants it, read straight off the disk this process owns: the
 * connections, the environments, the auth and variables of the workspace file, its docs, and the
 * tree of each collection, every level with what it declares. Nothing here is guessed from a tree
 * that never opened a body.
 * With a `collection` route only that collection is read; the rest of the tree is left alone.
 */
export async function workspaceDataOf(
    root: string,
    workspaceId: string,
    collection?: string,
): Promise<WorkspaceData> {
    const [workspace, listed, environments, tree, docs] = await Promise.all([
        readWorkspace(root, workspaceId),
        listConnections(root, workspaceId),
        listEnvironments(root, workspaceId),
        readCollectionTree(root, workspaceId),
        docsOf(root, workspaceId),
    ]);

    const collections = await collectionsOf(root, workspaceId, nodesOf(tree.nodes, collection));

    return {
        name: workspace.ok ? workspace.value.name : workspaceId,
        connections: listed.connections,
        environments: environments.environments,
        auth: concreteOf(workspace.ok ? workspace.value.auth : undefined),
        // The globals of the origin, secrets empty on disk: each format carries them at its level.
        globals: (await readGlobals(root).catch(() => ({ variables: [] }))).variables,
        docs,
        collections,
    };
}

/** The top level of the tree, or only the collection the route names. */
function nodesOf(
    nodes: readonly CollectionNode[],
    collection: string | undefined,
): readonly CollectionNode[] {
    return collection === undefined ? nodes : nodes.filter((node) => node.path === collection);
}

/** Every doc with the text it has on disk and the title it is known by: a note leaves as it is. */
async function docsOf(root: string, workspaceId: string): Promise<WorkspaceDoc[]> {
    const listed = await listDocs(root, workspaceId);

    return Promise.all(
        listed.map(async ({ name, title }) => ({
            name,
            title,
            text: await readDoc(root, workspaceId, name),
        })),
    );
}

/** The disk the walk reads from: the repo root and the workspace under it. */
type DiskSource = { root: string; workspaceId: string };

async function collectionsOf(
    root: string,
    workspaceId: string,
    nodes: readonly CollectionNode[],
): Promise<WorkspaceCollectionSource[]> {
    const disk: DiskSource = { root, workspaceId };
    const collections: WorkspaceCollectionSource[] = [];

    for (const node of nodes) {
        if (node.kind !== 'collection') {
            continue;
        }

        collections.push(await levelOf(disk, node));
    }

    return collections;
}

/** One collection or folder with what its file declares, the folders inside it and its items. */
async function levelOf(
    disk: DiskSource,
    level: CollectionNode & { kind: 'collection' | 'folder' },
): Promise<WorkspaceFolderNode> {
    const file = await readFolderSettings(disk.root, disk.workspaceId, level.path);
    const folders: WorkspaceFolderNode[] = [];
    const items: CollectionItem[] = [];

    for (const node of level.children) {
        if (node.kind === 'folder') {
            folders.push(await levelOf(disk, node));
        } else {
            items.push(await readItem(disk.root, disk.workspaceId, node.path));
        }
    }

    return {
        name: level.name,
        settings: settingsOf(file),
        folders,
        items,
        ...arrangedOf(level),
    };
}

function placeOf({ kind }: CollectionNode): 'folder' | 'item' {
    if (kind === 'folder') {
        return 'folder';
    }

    return 'item';
}

/** The arrangement of a level, said only when a folder comes after an item. */
function arrangedOf(level: CollectionNode & { kind: 'collection' | 'folder' }): {
    sequence?: ('folder' | 'item')[];
} {
    const sequence = level.children.map(placeOf);
    const firstItem = sequence.indexOf('item');

    return firstItem !== -1 && firstItem < sequence.lastIndexOf('folder') ? { sequence } : {};
}

function settingsOf(file: FolderSettings): WorkspaceFolderSettings {
    return {
        ...(file.description === undefined ? {} : { description: file.description }),
        variables: file.variables ?? [],
        auth: concreteOf(file.auth),
        headers: file.headers ?? [],
        ...(file.importedScripts === undefined ? {} : { importedScripts: file.importedScripts }),
        ...(file.scripts === undefined ? {} : { scripts: file.scripts }),
    };
}

/** An auth that decides at this level; absent and `{ inherit: true }` both defer. */
function concreteOf(auth: AuthConfig | undefined): ConcreteAuth | undefined {
    return auth === undefined || 'inherit' in auth ? undefined : auth;
}
