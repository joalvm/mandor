import type { InteropFile } from '@mandor/interop-core';

import type { BrunoNode, BrunoSkipped } from './bruno-tree.js';
import type { DirNode } from './dir-tree.js';
import { stemOf } from './file-name.js';
import { itemSchema } from './opencollection-schema.js';
import { ordered } from './order-nodes.js';
import { parseOcFile } from './parse-oc-file.js';
import { parseValue } from './parse-value.js';
import { folderOf } from './read-oc-folder.js';
import { requestOf, type OcItem } from './read-oc-request.js';
import { websocketOf } from './read-oc-websocket.js';

/**
 * An item told apart by what it holds: `items` make a folder, an `http` or `graphql` part a
 * request and a `websocket` part a WebSocket request. Anything else (gRPC, a script, an app) is
 * left out and named.
 */
function nodeOfItem(
    item: OcItem,
    fallback: string,
    skipped: BrunoSkipped[],
): BrunoNode | undefined {
    const name = item.info?.name ?? fallback;

    if (item.items !== null && item.items !== undefined) {
        return folderOf(item, name, nodesOfItems(item.items, name, skipped));
    }

    const request = requestOf(item, name) ?? websocketOf(item, name);

    if (request === undefined) {
        skipped.push({ kind: item.info?.type ?? item.type ?? 'item', name });
    }

    return request;
}

/** The nodes of items written inline, as a bundled collection keeps them. */
export function nodesOfItems(
    items: readonly unknown[],
    where: string,
    skipped: BrunoSkipped[],
): BrunoNode[] {
    return items.flatMap((value, index) => {
        const item = parseValue(value, `${where}[${String(index)}]`, itemSchema);
        const node = nodeOfItem(item, `Item ${String(index + 1)}`, skipped);

        return node === undefined ? [] : [node];
    });
}

function nodeOfFile(file: InteropFile, skipped: BrunoSkipped[]): BrunoNode[] {
    const node = nodeOfItem(parseOcFile(file, itemSchema), stemOf(file.path), skipped);

    return node === undefined ? [] : [node];
}

/** The folder a directory is: what its `folder.yml` says, and the files and directories in it. */
function folderOfDir(dir: DirNode, skipped: BrunoSkipped[]): BrunoNode {
    const item = dir.folder === undefined ? undefined : parseOcFile(dir.folder, itemSchema);

    return folderOf(item, item?.info?.name ?? dir.name, nodesOfDir(dir, skipped));
}

/** The nodes a directory holds, in the order Bruno shows them. */
export function nodesOfDir(dir: DirNode, skipped: BrunoSkipped[]): BrunoNode[] {
    return ordered([
        ...dir.files.flatMap((file) => nodeOfFile(file, skipped)),
        ...dir.dirs.map((child) => folderOfDir(child, skipped)),
    ]);
}
