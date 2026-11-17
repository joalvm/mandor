import {
    type CollectionNode,
    collectionItemExamples,
    collectionItemMark,
    childPath,
    parseCollectionItem,
    reconciledOrder,
} from '@mandor/schema';

import type { LoadWarning } from '../disk/load-warning.js';
import { nameOfYaml } from '../disk/name-of-yaml.js';
import { readTextOrNull } from '../disk/read-text.js';
import { readDocument } from '../disk/read-document.js';
import { collectionEntries } from './collection-entries.js';
import { collectionDir, folderDir, itemFile } from './collection-path.js';
import { readCollectionsFile } from './read-collections-file.js';
import { readFolderSettings } from './read-folder-settings.js';

export type ListedCollection = {
    nodes: CollectionNode[];
    warnings: LoadWarning[];
};

/** What one walk of the tree carries along: where it is reading, and what it could not read. */
type Walk = {
    root: string;
    workspaceId: string;
    warnings: LoadWarning[];
};

/**
 * The whole collection of a workspace as the lateral draws it: structure, names and order, with no
 * bodies. Disk is the truth about what exists and the order files only say how to arrange it, so
 * an order that lies costs an arrangement and never an item. The first level is collections —
 * one directory each, with its own file — and inside them come folders and items.
 */
export async function readCollectionTree(
    root: string,
    workspaceId: string,
): Promise<ListedCollection> {
    const walk: Walk = { root, workspaceId, warnings: [] };
    const { order } = await readCollectionsFile(root, workspaceId);
    const { folders, items } = await collectionEntries(collectionDir(root, workspaceId));

    // The top level holds collections: an item file that lost its folder is a shape the
    // workspace does not draw, so it is named in a warning and left out, like an unreadable one.
    walk.warnings.push(
        ...(await Promise.all(items.map((name) => looseItem(itemFile(root, workspaceId, name))))),
    );

    const names = reconciledOrder(order, folders);
    const nodes = await Promise.all(names.map((name) => collectionNode(walk, name)));

    return { nodes, warnings: walk.warnings };
}

/** The warning of an item with no collection above it, with the name it carries when it has one. */
async function looseItem(file: string): Promise<LoadWarning> {
    const name = nameOfYaml(await readTextOrNull(file));

    return {
        path: file,
        message: 'the top level holds collections, not items',
        ...(name === '' ? {} : { name }),
    };
}

async function collectionNode(walk: Walk, path: string): Promise<CollectionNode> {
    const collection = await readFolderSettings(walk.root, walk.workspaceId, path);
    const dir = folderDir(walk.root, walk.workspaceId, path);
    const children = await nodesIn(walk, dir, path, collection.order);

    return {
        kind: 'collection',
        path,
        name: collection.name,
        ...(collection.description === undefined ? {} : { description: collection.description }),
        children,
    };
}

async function nodesIn(
    walk: Walk,
    dir: string,
    prefix: string,
    order: readonly string[],
): Promise<CollectionNode[]> {
    const { folders, items } = await collectionEntries(dir);
    const names = reconciledOrder(order, [...folders, ...items]);
    const nodes = await Promise.all(
        names.map((name) => nodeOf(walk, childPath(prefix, name), folders.includes(name))),
    );

    return nodes.filter((node) => node !== null);
}

async function nodeOf(walk: Walk, path: string, isFolder: boolean): Promise<CollectionNode | null> {
    if (isFolder) {
        return await folderNode(walk, path);
    }

    return await itemNode(walk, path);
}

async function folderNode(walk: Walk, path: string): Promise<CollectionNode> {
    const folder = await readFolderSettings(walk.root, walk.workspaceId, path);
    const dir = folderDir(walk.root, walk.workspaceId, path);
    const children = await nodesIn(walk, dir, path, folder.order);

    return { kind: 'folder', path, name: folder.name, children };
}

/** An item nobody can read is left out of the tree and named in a warning, never guessed at. */
async function itemNode(walk: Walk, path: string): Promise<CollectionNode | null> {
    const read = await readDocument(
        itemFile(walk.root, walk.workspaceId, path),
        parseCollectionItem,
    );

    if (!read.ok) {
        walk.warnings.push(read.warning);

        return null;
    }

    const mark = collectionItemMark(read.value);
    const examples = collectionItemExamples(read.value);

    return {
        kind: 'item',
        path,
        name: read.value.name,
        itemKind: read.value.kind,
        tags: read.value.tags,
        ...(mark === undefined ? {} : { mark }),
        ...(examples === undefined ? {} : { examples }),
    };
}
