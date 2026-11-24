import type { InteropFile } from '@mandor/interop-core';
import type { z } from 'zod';

import { BrunoParseError } from './bruno-parse-error.js';
import type { BrunoDocument, BrunoEnvironment, BrunoNode, BrunoSkipped } from './bruno-tree.js';
import { dirTreeOf } from './dir-tree.js';
import { documentSourceId } from './document-source-id.js';
import { stemOf } from './file-name.js';
import { leftOutOf } from './left-out-of.js';
import { collectionSchema, environmentSchema } from './opencollection-schema.js';
import { ordered } from './order-nodes.js';
import { parseOcFile } from './parse-oc-file.js';
import { authOfOpenCollection } from './read-oc-auth.js';
import { scriptPartsOf } from './read-bru-scripts.js';
import { descriptionTextOf, rowsOf } from './read-oc-parts.js';
import { nodesOfDir, nodesOfItems } from './read-oc-tree.js';
import { environmentFrom, variablesFrom } from './read-oc-variables.js';

const COLLECTION_FILE = 'opencollection.yml';
const ENVIRONMENTS = 'environments/';
const YAML = /\.ya?ml$/iu;

type Collection = z.output<typeof collectionSchema>;

/** The environments the collection keeps in its own file, then the ones of `environments/`. */
function environmentsOf(collection: Collection, files: readonly InteropFile[]): BrunoEnvironment[] {
    const inline = (collection.config?.environments ?? []).map((environment, index) =>
        environmentFrom(environment, `Environment ${String(index + 1)}`),
    );
    const kept = files.map((file) =>
        environmentFrom(parseOcFile(file, environmentSchema), stemOf(file.path)),
    );

    return [...inline, ...kept];
}

function descriptionOf(collection: Collection): string {
    return descriptionTextOf(collection.docs) || (collection.info?.summary ?? '');
}

/** The items written inline, then the ones of the directories, as Bruno shows them. */
function childrenOf(
    collection: Collection,
    yaml: readonly InteropFile[],
    skipped: BrunoSkipped[],
): BrunoNode[] {
    const tree = dirTreeOf(
        yaml.filter((file) => !file.path.startsWith(ENVIRONMENTS)),
        'folder.yml',
    );

    return ordered([
        ...nodesOfItems(collection.items ?? [], 'items', skipped),
        ...nodesOfDir(tree, skipped),
    ]);
}

/**
 * The collection a folder of OpenCollection is: `opencollection.yml` says what it is called and
 * what it asks of every request, a directory is a folder and a file in it a request, and the
 * files of `environments/` are its environments. A bundled collection holds its items inline.
 */
export function readOpenCollection(files: readonly InteropFile[]): BrunoDocument {
    const rootFile = files.find((file) => file.path === COLLECTION_FILE);

    if (rootFile === undefined) {
        throw new BrunoParseError([`${COLLECTION_FILE}: the file is missing`]);
    }

    const collection = parseOcFile(rootFile, collectionSchema);
    const yaml = files.filter((file) => file.path !== COLLECTION_FILE && YAML.test(file.path));
    const skipped: BrunoSkipped[] = [];
    const name = collection.info?.name ?? '';
    const defaults = collection.request;
    const scripts = scriptPartsOf(defaults?.scripts);

    return {
        sourceId: documentSourceId(name),
        name,
        description: descriptionOf(collection),
        headers: rowsOf(defaults?.headers),
        auth: authOfOpenCollection(defaults?.auth),
        variables: variablesFrom(defaults?.variables),
        children: childrenOf(collection, yaml, skipped),
        environments: environmentsOf(
            collection,
            yaml.filter((file) => file.path.startsWith(ENVIRONMENTS)),
        ),
        skipped,
        scripts: scripts.read,
        leftOut: leftOutOf({
            scripts: scripts.unread,
            actions: defaults?.actions,
        }),
    };
}
