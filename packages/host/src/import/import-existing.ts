import {
    chooseByKey,
    environmentFingerprint,
    fingerprintOf,
    type ExistingResource,
    type KeyHandlers,
    workspaceFingerprint,
} from '@mandor/interop-core';
import type { CollectionNode, Environment, Workspace } from '@mandor/schema';
import {
    listConnections,
    listDocs,
    listEnvironments,
    readFolderSettings,
    readCollectionTree,
    readItem,
    readWorkspace,
} from '@mandor/store-fs';

import { ownFingerprint } from './own-collection.js';

/**
 * What the workspace already holds, as the plan sees it: every connection and environment with
 * its origin, every folder and every note with none, every item with whatever import wrote it,
 * and the auth of the workspace file when there is one. This is the side of the diff the user's own work lives
 * on, so it is read straight from disk and never guessed.
 */
export async function existingResourcesOf(
    root: string,
    workspaceId: string,
): Promise<ExistingResource[]> {
    const [listed, tree, environments, workspace, docs] = await Promise.all([
        listConnections(root, workspaceId),
        readCollectionTree(root, workspaceId),
        listEnvironments(root, workspaceId),
        readWorkspace(root, workspaceId),
        listDocs(root, workspaceId),
    ]);

    return [
        ...(workspace.ok ? workspaceOf(workspace.value) : []),
        ...environments.environments.map(environmentOf),
        ...listed.connections.map((connection) => ({
            place: 'connection' as const,
            route: connection.id,
            name: connection.name,
            origin: connection.origin,
            fingerprint: fingerprintOf({
                name: connection.name,
                url: connection.url,
                transport: connection.transport,
                headers: connection.headers,
            }),
        })),
        ...docs.map(({ name, title }) => ({ place: 'doc' as const, route: name, name: title })),
        ...(await nodesOf(root, workspaceId, tree.nodes)),
    ];
}

async function nodesOf(
    root: string,
    workspaceId: string,
    nodes: readonly CollectionNode[],
): Promise<ExistingResource[]> {
    const found: ExistingResource[] = [];
    const readers = readersOf(root, workspaceId);

    for (const node of nodes) {
        found.push(...(await chooseByKey(readers, node.kind, node)));
    }

    return found;
}

/** How each kind of node reads: itself first, then what hangs from it. */
function readersOf(
    root: string,
    workspaceId: string,
): KeyHandlers<'kind', CollectionNode, Promise<ExistingResource[]>> {
    return {
        collection: async (node) => {
            const file = await readFolderSettings(root, workspaceId, node.path);

            return [
                {
                    place: 'collection',
                    route: node.path,
                    name: node.name,
                    origin: file.importOrigin,
                    fingerprint: ownFingerprint(file),
                },
                ...(await nodesOf(root, workspaceId, node.children)),
            ];
        },
        folder: async (node) => [
            { place: 'folder', route: node.path, name: node.name },
            ...(await nodesOf(root, workspaceId, node.children)),
        ],
        item: async (node) => {
            const item = await readItem(root, workspaceId, node.path);

            return [
                {
                    place: 'item',
                    route: node.path,
                    name: node.name,
                    origin: item.origin,
                    // What the mapper hashed when it wrote the item: the name, the tags it brought
                    // and the body, and nothing else of the envelope around them.
                    fingerprint: fingerprintOf({
                        name: item.name,
                        ...(item.tags.length === 0 ? {} : { tags: item.tags }),
                        ...item.body,
                    }),
                },
            ];
        },
    };
}

/**
 * The workspace file counts as a resource only while it holds something an import could have
 * written: its auth, or the claim over it. Variables alone do not make it one:
 * the import merges them, and from then on they are the person's.
 */
function workspaceOf(workspace: Workspace): ExistingResource[] {
    if (workspace.importOrigin === undefined && workspace.auth === undefined) {
        return [];
    }

    return [
        {
            place: 'workspace',
            route: '.',
            name: workspace.name,
            origin: workspace.importOrigin,
            fingerprint: workspaceFingerprint(workspace),
        },
    ];
}

/** Names only: the values of an environment belong to the person who filled them in. */
function environmentOf(environment: Environment): ExistingResource {
    return {
        place: 'environment',
        route: environment.id,
        name: environment.name,
        origin: environment.origin,
        fingerprint: environmentFingerprint(environment),
    };
}
