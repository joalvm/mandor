import type { ImportResource } from '@mandor/interop-core';
import {
    createCollection,
    createCollectionFolder,
    createCollectionItem,
    createConnection,
    writeEnvironment,
    writeImportedWorkspace,
    writeItem,
} from '@mandor/store-fs';

/** The route the resource files under: everything above its last segment. */
function parentOf(route: string): string {
    return route.split('/').slice(0, -1).join('/');
}

/** The id the resource is filed under: the last segment of its route. */
function idOf(route: string): string {
    return route.split('/').at(-1) ?? '';
}

/**
 * Lays the workspace out the way an import writes it: the auth of the workspace file, one
 * environment per server, one folder per group the document tags its traffic with, one item
 * per operation the client can send, loose keys and all. Nothing here knows the exporter
 * exists, which is the point — this is the disk the exporter will be asked to read back.
 */
export async function writeImportedResources(
    dir: string,
    workspaceId: string,
    resources: readonly ImportResource[],
): Promise<void> {
    for (const resource of resources) {
        if (resource.place === 'collection') {
            await createCollection(dir, workspaceId, {
                id: idOf(resource.route),
                name: resource.name,
            });

            continue;
        }

        if (resource.place === 'folder') {
            await createCollectionFolder(dir, workspaceId, parentOf(resource.route), {
                id: idOf(resource.route),
                name: resource.name,
            });

            continue;
        }

        if (resource.place === 'item') {
            const kind = resource.itemKind ?? 'message';

            await createCollectionItem(dir, workspaceId, parentOf(resource.route), {
                id: idOf(resource.route),
                kind,
                name: resource.name,
            });
            await writeItem(dir, workspaceId, resource.route, {
                kind,
                name: resource.name,
                tags: [],
                body: resource.fields,
            });

            continue;
        }

        await writeImportedEnvelope(dir, workspaceId, resource);
    }
}

/** The resources that are not pieces of the collection: the connection and the two envelopes. */
async function writeImportedEnvelope(
    dir: string,
    workspaceId: string,
    resource: ImportResource,
): Promise<void> {
    if (resource.place === 'connection') {
        await createConnection(dir, workspaceId, {
            id: resource.route,
            name: String(resource.fields['name']),
            transport: resource.fields['transport'] === 'socketio' ? 'socketio' : 'websocket',
            url: String(resource.fields['url']),
            headers: [],
        });
    }

    if (resource.place === 'environment') {
        await writeEnvironment(dir, workspaceId, {
            id: resource.route,
            name: resource.name,
            variables: resource.fields['variables'] as never,
            origin: resource.origin,
        });
    }

    if (resource.place === 'workspace') {
        const patch = {
            auth: resource.fields['auth'] as never,
            variables: [],
            importedScripts: null,
        };

        await writeImportedWorkspace(dir, workspaceId, patch, resource.origin);
    }
}
