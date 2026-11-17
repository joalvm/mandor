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
    InsomniaDocument,
    InsomniaFolder,
    InsomniaNode,
    InsomniaRequest,
    InsomniaWebSocket,
} from '../document/insomnia-tree.js';
import { folderResourceOf } from './folder-resource.js';
import { requestResourceOf } from './request-resource.js';
import { baseVariablesOf } from './environment-resources.js';

function isSocket(node: InsomniaNode): node is InsomniaWebSocket {
    return node.kind === 'websocket';
}

function isTreeNode(node: InsomniaNode): node is InsomniaFolder | InsomniaRequest {
    return !isSocket(node);
}

const MAKERS: TreeMakers<InsomniaFolder, InsomniaRequest> = {
    request: requestResourceOf,
    folder: folderResourceOf,
    inside: (folder, route, walk) => resourcesOf(folder.children, route, walk),
};

/** One folder or request per node, parents first; siblings share a directory, so one id each. */
function resourcesOf(
    nodes: readonly InsomniaNode[],
    parent: string,
    walk: TreeWalk,
): ImportResource[] {
    return nodes.filter(isTreeNode).flatMap((node) => treeResourcesOf(node, parent, walk, MAKERS));
}

function skippedText(kind: string, name: string): Degradation {
    return degradation('kindLeftOut', { kind: kind.replaceAll('_', ' '), name });
}

/**
 * The collection a document is: one collection named and described as the document said, then
 * its folders and requests inside it. The WebSocket requests are not part of it: they are
 * connections of the workspace. What the document held that is neither is said on the
 * collection, one line each.
 */
export function collectionResourcesOf(document: InsomniaDocument): ImportResource[] {
    const base = baseVariablesOf(document);
    const collection = collectionResourceOf({
        name: document.name,
        description: document.description === '' ? undefined : document.description,
        variables: base.variables,
        origin: { kind: 'insomnia', sourceId: document.sourceId },
    });
    const taken: TakenRoutes = new Map([[collection.route, new Set<string>()]]);
    const degradations = [
        ...base.degradations,
        ...document.skipped.map(({ kind, name }) => skippedText(kind, name)),
    ];

    return [
        { ...collection, degradations },
        ...resourcesOf(document.children, collection.route, { sourceId: document.sourceId, taken }),
    ];
}
