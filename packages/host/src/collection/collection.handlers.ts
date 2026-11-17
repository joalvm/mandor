import type { RepoChange } from '@mandor/git';
import {
    CHANNELS,
    collectionCreateRequestSchema,
    collectionDeleteRequestSchema,
    collectionMoveRequestSchema,
    collectionReadItemRequestSchema,
    collectionRenameRequestSchema,
    collectionReorderRequestSchema,
    collectionWriteItemRequestSchema,
    type Empty,
} from '@mandor/ipc';
import {
    collectionItemFields,
    collectionPlace,
    childPath,
    newId,
    parseCollectionItem,
    type CollectionItem,
} from '@mandor/schema';
import {
    createCollectionFolder,
    createCollectionItem,
    moveCollectionNode,
    readItem,
    removeCollectionNode,
    renameFolder,
    renameItem,
    reorderCollectionNode,
    itemFile,
    itemTextWith,
    nameInText,
    readTextOrNull,
    writeItem,
} from '@mandor/store-fs';

import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { rootedHandler } from '../ipc/rooted-handler.js';
import type { UnreadableDeps } from '../notice/unreadable-files.js';
import { guardedWrite } from '../repo/guarded-write.js';
import { rememberText } from '../repo/known-texts.js';
import { nameOnDisk } from '../repo/name-on-disk.js';
import { reshapeRepo } from '../repo/reshape-repo.js';
import { writeInRepo } from '../repo/write-in-repo.js';
import { readTree } from './collection-tree.js';
import { isFolder, itemPlace, nodePlaces, orderPlace } from './collection-places.js';
import { holderName, nodeName } from './node-names.js';
import { searchCollection } from './search-collection.js';

const EMPTY: Empty = {};

/** The change a move writes in the history, by what moved: a collection moves as a folder. */
const MOVE_CHANGES = {
    collection: 'move-folder',
    folder: 'move-folder',
    item: 'move-item',
} as const;

const move = rootedHandler(collectionMoveRequestSchema, async (root, request) => {
    const { workspaceId, from, kind, to, before } = request;
    const name = await nodeName(root, workspaceId, from);
    const holder = await holderName(root, workspaceId, collectionPlace(to).parent);

    return reshapeRepo(
        {
            root,
            paths: nodePlaces(root, workspaceId, from, to),
            change: { kind: MOVE_CHANGES[kind], name, to: holder },
        },
        async () => {
            await moveCollectionNode(root, workspaceId, { before, from, kind, to });

            return EMPTY;
        },
    );
});

const reorder = rootedHandler(collectionReorderRequestSchema, async (root, request) => {
    const { workspaceId, parent, name, before } = request;

    return writeInRepo(
        {
            root,
            path: orderPlace(root, workspaceId, parent),
            change: { kind: 'reorder-folder', name: await holderName(root, workspaceId, parent) },
        },
        async () => {
            await reorderCollectionNode(root, workspaceId, parent, { name, before });

            return EMPTY;
        },
    );
});

/** Renaming is the same change twice, so a folder and an item differ in the work and the name. */
function renamer(kind: 'rename-folder' | 'rename-item', rename: typeof renameFolder) {
    return rootedHandler(collectionRenameRequestSchema, (root, { workspaceId, path, name }) =>
        reshapeRepo(
            { root, paths: nodePlaces(root, workspaceId, path), change: { kind, name } },
            async () => {
                await rename(root, workspaceId, path, name);

                return EMPTY;
            },
        ),
    );
}

const create = rootedHandler(collectionCreateRequestSchema, (root, request) => {
    const { workspaceId, parent, name, itemKind } = request;
    const id = newId();
    const paths = nodePlaces(root, workspaceId, childPath(parent, id));

    if (itemKind === undefined) {
        return reshapeRepo({ root, paths, change: { kind: 'create-folder', name } }, () =>
            createCollectionFolder(root, workspaceId, parent, { id, name }),
        );
    }

    return reshapeRepo({ root, paths, change: { kind: 'create-item', name } }, () =>
        createCollectionItem(root, workspaceId, parent, { id, kind: itemKind, name }),
    );
});

const readOneItem = rootedHandler(collectionReadItemRequestSchema, async (root, request) => {
    const { workspaceId, path } = request;
    const text = await readTextOrNull(itemFile(root, workspaceId, path));
    const item = await readItem(root, workspaceId, path);

    rememberText(root, itemPlace(root, workspaceId, path), text);

    return collectionItemFields(item);
});

/**
 * The name of an item is the rename channel's: a save carries the name its window last held, and
 * a rename that came after (this window's or a colleague's) must outlive it. `onDisk` is `''`
 * when the file has no name yet, and then the save names it.
 */
function keepingName(item: CollectionItem, onDisk: string): CollectionItem {
    return onDisk === '' ? item : { ...item, name: onDisk };
}

const writeOneItem = rootedHandler(collectionWriteItemRequestSchema, (root, request) => {
    const { workspaceId, path, fields } = request;

    const item = parseCollectionItem(fields);
    const place = itemPlace(root, workspaceId, path);

    return guardedWrite({
        root,
        path: place,
        // Started here, awaited after the turn: a rename queued ahead of this save is not overtaken.
        change: nameOnDisk(root, place).then((name): RepoChange => ({
            kind: 'update-item',
            name: keepingName(item, name).name,
        })),
        oursFrom: (base) =>
            itemTextWith(base, keepingName(item, base === null ? '' : nameInText(place, base))),
        write: async () =>
            writeItem(root, workspaceId, path, keepingName(item, await nameOnDisk(root, place))),
    }).then(() => EMPTY);
});

const remove = rootedHandler(collectionDeleteRequestSchema, async (root, { workspaceId, path }) => {
    const kind = (await isFolder(root, workspaceId, path)) ? 'delete-folder' : 'delete-item';
    const name = await nodeName(root, workspaceId, path);

    return reshapeRepo(
        { root, paths: nodePlaces(root, workspaceId, path), change: { kind, name } },
        async () => {
            await removeCollectionNode(root, workspaceId, path);

            return EMPTY;
        },
    );
});

function handlersOf(reporting: UnreadableDeps) {
    return [
        [CHANNELS.collectionTree, readTree(reporting)],
        [CHANNELS.collectionMove, move],
        [CHANNELS.collectionReorder, reorder],
        [CHANNELS.collectionRenameFolder, renamer('rename-folder', renameFolder)],
        [CHANNELS.collectionRenameItem, renamer('rename-item', renameItem)],
        [CHANNELS.collectionCreate, create],
        [CHANNELS.collectionDelete, remove],
        [CHANNELS.collectionReadItem, readOneItem],
        [CHANNELS.collectionWriteItem, writeOneItem],
        [CHANNELS.collectionSearch, searchCollection],
    ] as const;
}

/**
 * Every channel a renderer uses over the collection of a workspace. Reading brings the shape of
 * the tree and no bodies. The path is the identity of a node and main draws it when the node is
 * made, so renaming rewrites the name inside the file and only a move changes a path.
 */
export function registerCollectionHandlers(ipc: HandlerIpc, reporting: UnreadableDeps): () => void {
    const handlers = handlersOf(reporting);

    for (const [channel, handler] of handlers) {
        ipc.handle(channel, (_event, raw) => handler(raw));
    }

    return () => {
        for (const [channel] of handlers) {
            ipc.removeHandler(channel);
        }
    };
}
