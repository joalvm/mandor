import {
    collectionResourceOf,
    degradation,
    type Degradation,
    type ImportResource,
    type TakenRoutes,
    type TreeMakers,
    treeResourcesOf,
    type TreeWalk,
} from '@mandor/interop-core';

import type {
    BrunoDocument,
    BrunoFolder,
    BrunoNode,
    BrunoRequest,
} from '../document/bruno-tree.js';
import { folderResourceOf } from './folder-resource.js';
import { folderSettingsOf } from './folder-settings-of.js';
import { isWebSocket } from './is-websocket.js';
import { leftOutText } from './left-out-text.js';
import { messageResourcesOf } from './message-resources.js';
import { requestResourceOf } from './request-resource.js';

const MAKERS: TreeMakers<BrunoFolder, BrunoRequest> = {
    request: requestResourceOf,
    folder: folderResourceOf,
    inside: (folder, route, walk) => resourcesOf(folder.children, route, walk),
};

/**
 * One folder or request per node, parents first; siblings share a directory, so one id each. A
 * WebSocket request is a connection of the workspace and is not here; the messages it keeps are,
 * where it hung.
 */
function resourcesOf(
    nodes: readonly BrunoNode[],
    parent: string,
    walk: TreeWalk,
): ImportResource[] {
    return nodes.flatMap((node) =>
        isWebSocket(node)
            ? messageResourcesOf(node, { sourceId: walk.sourceId, parent, taken: walk.taken })
            : treeResourcesOf(node, parent, walk, MAKERS),
    );
}

function degradationsOf(document: BrunoDocument, level: readonly Degradation[]): Degradation[] {
    return [
        ...document.skipped.map(({ kind, name }) => degradation('kindLeftOut', { kind, name })),
        ...level,
        ...leftOutText('collection', document.leftOut),
    ];
}

/**
 * The collection a document is: one collection named as the document said, with what it says of
 * itself, then its folders and requests inside it. What the document held that Mandor cannot is
 * said on the collection, one line each.
 */
export function collectionResourcesOf(document: BrunoDocument): ImportResource[] {
    const level = folderSettingsOf(document, 'collection');
    const collection = collectionResourceOf({
        name: document.name,
        ...level.settings,
        origin: { kind: 'bruno', sourceId: document.sourceId },
    });
    const taken: TakenRoutes = new Map([[collection.route, new Set<string>()]]);

    return [
        { ...collection, degradations: degradationsOf(document, level.degradations) },
        ...resourcesOf(document.children, collection.route, { sourceId: document.sourceId, taken }),
    ];
}
