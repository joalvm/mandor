import { collectionItemMark, type CollectionItem } from '@mandor/schema';
import { z } from 'zod';

import { childrenInOrder } from './children-in-order.js';
import {
    collectionId,
    connectionId,
    docId,
    environmentId,
    folderId,
    itemId,
    SETTINGS_ID,
} from './outline-ids.js';
import {
    connectionKindOf,
    itemKindOf,
    OUTLINE_KINDS,
    OUTLINE_LOSSES,
    type OutlineKind,
    type OutlineLoss,
    type UnwrittenKinds,
    unwrittenReasonOf,
} from './outline-kind.js';
import { itemNoteOf } from './unkept-of-item.js';
import {
    connectionNoteOf,
    levelNoteOf,
    unkeptIn,
    unwrittenIn,
    variablesNoteOf,
    type UnkeptLevels,
} from './unkept-parts.js';
import type { WorkspaceData, WorkspaceFolderNode } from './workspace-data.js';

/**
 * One node of what a workspace would export. A node with a `reason` is left out: the reason is
 * the format's, and an empty one is a branch with nothing left to write under it.
 */
export type OutlineNode = {
    children: OutlineNode[];
    id: string;
    kind: OutlineKind;
    label: string;
    /** The method of a request, which the tree wears in place of a glyph; other nodes carry none. */
    mark?: string | undefined;
    /** Why it does not leave; empty when a branch is barred only because its children are. */
    reason?: OutlineLoss | '' | undefined;
    /** What the format does not keep of this level, or keeps somewhere else. It is still written. */
    unkept?: OutlineLoss[] | undefined;
};

export const outlineNodeSchema: z.ZodType<OutlineNode> = z.lazy(() =>
    z
        .object({
            children: z.array(outlineNodeSchema),
            id: z.string().min(1),
            kind: z.enum(OUTLINE_KINDS),
            label: z.string(),
            mark: z.string().optional(),
            reason: z.enum(OUTLINE_LOSSES).or(z.literal('')).optional(),
            unkept: z.array(z.enum(OUTLINE_LOSSES)).optional(),
        })
        .strict(),
);

/** A leaf answers for its kind; a branch is barred, wordless, when every child under it is. */
function reasonOf(
    own: OutlineLoss | undefined,
    children: readonly OutlineNode[],
): OutlineNode['reason'] {
    if (children.length === 0) {
        return own;
    }

    return children.every((child) => child.reason !== undefined) ? '' : undefined;
}

/** What the format says of the nodes: which it leaves out, and what it loses of each level. */
type OutlineRules = { unwritten: UnwrittenKinds; unkept: UnkeptLevels };

function nodeOf(
    base: Pick<OutlineNode, 'id' | 'kind' | 'label' | 'mark' | 'unkept'>,
    children: OutlineNode[],
    unwritten: UnwrittenKinds,
): OutlineNode {
    const reason = reasonOf(unwrittenReasonOf(base.kind, unwritten), children);

    return { ...base, children, ...(reason === undefined ? {} : { reason }) };
}

function itemNode(
    holder: string,
    item: CollectionItem,
    index: number,
    rules: OutlineRules,
): OutlineNode {
    const mark = collectionItemMark(item);

    return nodeOf(
        {
            id: itemId(holder, index),
            kind: itemKindOf(item),
            label: item.name,
            ...(mark === undefined ? {} : { mark }),
            ...itemNoteOf(item, rules.unkept),
        },
        [],
        rules.unwritten,
    );
}

function folderNode(
    holder: string,
    folder: WorkspaceFolderNode,
    index: number,
    rules: OutlineRules,
): OutlineNode {
    const id = folderId(holder, index);

    return nodeOf(
        {
            id,
            kind: 'folder',
            label: folder.name,
            ...levelNoteOf(folder, rules.unkept.folder, rules.unkept),
        },
        childrenOf(id, folder, rules),
        rules.unwritten,
    );
}

/** What hangs from a level, at any depth, in the order the person arranged it. */
function childrenOf(id: string, level: WorkspaceFolderNode, rules: OutlineRules): OutlineNode[] {
    return childrenInOrder<OutlineNode>(level, {
        folder: (folder, index) => [folderNode(id, folder, index, rules)],
        item: (item, index) => [itemNode(id, item, index, rules)],
    });
}

function collectionNode(
    source: WorkspaceFolderNode,
    index: number,
    rules: OutlineRules,
): OutlineNode {
    const id = collectionId(index);

    return nodeOf(
        {
            id,
            kind: 'collection',
            label: source.name,
            ...levelNoteOf(source, rules.unkept.collection, rules.unkept),
        },
        childrenOf(id, source, rules),
        rules.unwritten,
    );
}

/**
 * The settings of the workspace, when it has any: its auth and the globals of its origin. The label is the
 * window's to say, because main knows no words; the node only says what it stands for.
 */
function settingsNodes(data: WorkspaceData, rules: OutlineRules): OutlineNode[] {
    if (data.auth === undefined && data.globals.length === 0) {
        return [];
    }

    return [
        nodeOf(
            {
                id: SETTINGS_ID,
                kind: 'settings',
                label: '',
                ...variablesNoteOf(data.globals, rules.unkept),
            },
            [],
            rules.unwritten,
        ),
    ];
}

/**
 * What a workspace holds, as the tree the export offers: its settings, its connections, its
 * environments, its collections with their folders and items, and its notes. `unwritten` is what
 * the format has no place for, and `unkept` what it loses of each level.
 */
export function workspaceOutline(
    data: WorkspaceData,
    unwritten: UnwrittenKinds,
    unkept: UnkeptLevels = { collection: {}, folder: {} },
): OutlineNode[] {
    const here = unwrittenIn(data, unwritten, unkept);

    return workspaceNodes(data, here, unkeptIn(data, unkept));
}

function workspaceNodes(
    data: WorkspaceData,
    unwritten: UnwrittenKinds,
    unkept: UnkeptLevels,
): OutlineNode[] {
    return [
        ...settingsNodes(data, { unwritten, unkept }),
        ...data.connections.map((connection) =>
            nodeOf(
                {
                    id: connectionId(connection),
                    kind: connectionKindOf(connection.transport),
                    label: connection.name,
                    ...connectionNoteOf(data, connection, unkept),
                },
                [],
                unwritten,
            ),
        ),
        ...data.environments.map((environment) =>
            nodeOf(
                {
                    id: environmentId(environment),
                    kind: 'environment',
                    label: environment.name,
                    ...variablesNoteOf(environment.variables, unkept),
                },
                [],
                unwritten,
            ),
        ),
        ...data.collections.map((collection, index) =>
            collectionNode(collection, index, { unwritten, unkept }),
        ),
        ...data.docs.map((doc) =>
            nodeOf({ id: docId(doc), kind: 'doc', label: doc.title }, [], unwritten),
        ),
    ];
}
