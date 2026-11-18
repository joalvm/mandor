import type { z } from 'zod';

import { documentSourceId } from './document-source-id.js';
import { InsomniaParseError } from './insomnia-parse-error.js';
import type { InsomniaDocument, InsomniaNode, InsomniaSkipped } from './insomnia-tree.js';
import { insomniaV5NodeSchema, insomniaV5Schema } from './insomnia-v5-schema.js';
import { environmentOf, folderOf, requestOf, websocketOf } from './node-of.js';

type Issues = { issues: readonly { path: readonly PropertyKey[]; message: string }[] };

function problemsOf(error: Issues): string[] {
    return error.issues.map((issue) => `${issue.path.map(String).join('.')}: ${issue.message}`);
}

/** What Insomnia calls the ids of its WebSocket requests; they are the only mark such an item has. */
const WEBSOCKET_PREFIX = 'ws-req';

type V5Node = z.infer<typeof insomniaV5NodeSchema>;
type ItemKind = 'folder' | 'request' | 'websocket' | 'other';
type Reader = (node: V5Node, skipped: InsomniaSkipped[]) => InsomniaNode[];

/** What an item of the tree is, told apart by what it holds: `children`, a `method`, an id. */
function itemKindOf(node: V5Node): ItemKind {
    if (node.children !== null && node.children !== undefined) {
        return 'folder';
    }

    if (node.method !== null && node.method !== undefined) {
        return 'request';
    }

    return node.meta?.id?.startsWith(WEBSOCKET_PREFIX) === true ? 'websocket' : 'other';
}

/** One reader per kind of item; an item that is neither is left out, named. */
const READERS: Record<ItemKind, Reader> = {
    folder: (node, skipped) => [
        folderOf(node, descriptionOf(node), nodesOf(node.children, skipped)),
    ],
    request: (node) => [requestOf(node, descriptionOf(node))],
    websocket: (node) => [websocketOf(node, descriptionOf(node))],
    other: (node, skipped) => {
        skipped.push({ kind: 'item', name: node.name ?? '' });

        return [];
    },
};

function descriptionOf(node: V5Node): string {
    return node.meta?.description ?? '';
}

/** The items of the tree as nodes: folders, HTTP requests and WebSocket requests. */
function nodesOf(
    items: readonly unknown[] | null | undefined,
    skipped: InsomniaSkipped[],
): InsomniaNode[] {
    return (items ?? []).flatMap((item): InsomniaNode[] => {
        const parsed = insomniaV5NodeSchema.safeParse(item);

        if (!parsed.success) {
            throw new InsomniaParseError(problemsOf(parsed.error));
        }

        return READERS[itemKindOf(parsed.data)](parsed.data, skipped);
    });
}

type FileEnvironments = z.infer<typeof insomniaV5Schema>['environments'];

/** The base environment of a file and the ones under it, each read the way the tree reads one. */
function environmentsOf(base: FileEnvironments) {
    if (base === null || base === undefined) {
        return { base: undefined, environments: [] };
    }

    return {
        base: environmentOf(base.name, base.data),
        environments: (base.subEnvironments ?? []).map((each) =>
            environmentOf(each.name, each.data),
        ),
    };
}

/** The collection a v5 file is: the tree as written, and the environments under `environments`. */
export function readV5(root: unknown): InsomniaDocument[] {
    const parsed = insomniaV5Schema.safeParse(root);

    if (!parsed.success) {
        throw new InsomniaParseError(problemsOf(parsed.error));
    }

    const file = parsed.data;
    const skipped: InsomniaSkipped[] = [];
    const name = file.name ?? '';

    return [
        {
            sourceId: documentSourceId(file.meta?.id, name),
            name,
            description: file.meta?.description ?? '',
            children: nodesOf(file.collection, skipped),
            ...environmentsOf(file.environments),
            skipped,
        },
    ];
}
