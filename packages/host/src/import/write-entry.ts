import type { ImportPlanEntry, ResourcePlace } from '@mandor/interop-core';
import { collectionPlace, examplesApart, type ItemOrigin } from '@mandor/schema';
import {
    createCollectionItem,
    deleteConnection,
    deleteEnvironment,
    NameTakenError,
    removeCollectionNode,
    writeImportedWorkspace,
    writeItem,
} from '@mandor/store-fs';

import { writeCollectionEntry } from './write-collection-entry.js';
import { writeConnectionEntry } from './write-connection-entry.js';
import { removeDocEntry, writeDocEntry } from './write-doc-entry.js';
import { writeEnvironmentEntry } from './write-environment-entry.js';
import { writeFolderEntry } from './write-folder-entry.js';
import { writeWorkspaceEntry } from './write-workspace-entry.js';
import { keepGlobals, writeGlobalsEntry } from './write-globals-entry.js';

/**
 * Writes one accepted entry into the workspace. A folder lands on the route the mapper chose and
 * keeps its order if it was there; an item already there is edited inside its own document, so comments and
 * the keys Mandor does not understand survive the rewrite; a connection is updated in place, and
 * environments, notes and the workspace file have writers of their own.
 */
export async function writeEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
    identity: ItemOrigin | null,
): Promise<void> {
    await WRITERS[entry.place](root, workspaceId, entry, identity);
}

type EntryWriter = (
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
    identity: ItemOrigin | null,
) => Promise<void>;

async function writeItemOf(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
    identity: ItemOrigin | null,
): Promise<void> {
    const resource = entry.resource;
    const { parent, name: id } = collectionPlace(entry.route);
    const name = resource?.name ?? entry.name;
    const kind = itemKindOf(entry);

    // The plan already picked the id of the item: it is the last segment of its route.
    await createItemIfAbsent(root, workspaceId, parent, { id, kind, name });
    await writeItem(root, workspaceId, entry.route, {
        kind,
        name,
        tags: [],
        origin: resource?.origin ?? identity ?? undefined,
        body: withExamplesApart(resource?.fields ?? {}),
    });
}

function isNamed(value: unknown): value is { name: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof Reflect.get(value, 'name') === 'string'
    );
}

/** A format lets two examples of a request share a name; the tree files each under its own. */
function withExamplesApart(fields: Record<string, unknown>): Record<string, unknown> {
    const examples = fields['examples'];

    return Array.isArray(examples)
        ? { ...fields, examples: examplesApart(examples.filter(isNamed)) }
        : fields;
}

function itemKindOf(entry: ImportPlanEntry): string {
    const kind = entry.resource?.itemKind;

    if (kind === undefined || kind === null) {
        throw new Error(`the item ${entry.route} names no kind`);
    }

    return kind;
}

async function createItemIfAbsent(
    root: string,
    workspaceId: string,
    parent: string,
    item: { id: string; kind: string; name: string },
): Promise<void> {
    try {
        await createCollectionItem(root, workspaceId, parent, item);
    } catch (error) {
        if (!(error instanceof NameTakenError)) {
            throw error;
        }
    }
}

/** The plan said the document no longer carries it, so it goes. */
export async function removeEntry(
    root: string,
    workspaceId: string,
    entry: ImportPlanEntry,
): Promise<void> {
    await REMOVERS[entry.place](root, workspaceId, entry.route);
}

/** The workspace file is never deleted: removing what an import wrote there empties it. */
async function emptyImportedWorkspace(root: string, workspaceId: string): Promise<void> {
    await writeImportedWorkspace(root, workspaceId, { auth: null, importedScripts: null }, null);
}

/** Who writes each place an import lands on. */
const WRITERS: Record<ResourcePlace, EntryWriter> = {
    collection: writeCollectionEntry,
    connection: writeConnectionEntry,
    doc: writeDocEntry,
    environment: writeEnvironmentEntry,
    folder: writeFolderEntry,
    globals: writeGlobalsEntry,
    item: writeItemOf,
    workspace: writeWorkspaceEntry,
};

/** Who removes each place, by the route the plan names. */
const REMOVERS: Record<
    ResourcePlace,
    (root: string, workspaceId: string, route: string) => Promise<void>
> = {
    collection: removeCollectionNode,
    connection: deleteConnection,
    doc: removeDocEntry,
    environment: deleteEnvironment,
    folder: removeCollectionNode,
    globals: keepGlobals,
    item: removeCollectionNode,
    workspace: emptyImportedWorkspace,
};
