import { documentRootOf, textOf, type InteropFile } from '@mandor/interop-core';

import { BrunoParseError } from './bruno-parse-error.js';
import type { BrunoDocument, BrunoSkipped } from './bruno-tree.js';
import { dirTreeOf } from './dir-tree.js';
import { documentSourceId } from './document-source-id.js';
import { leftOutOf } from './left-out-of.js';
import { authOfBru } from './read-bru-auth.js';
import { environmentOfBru } from './read-bru-environment.js';
import { levelOfBru } from './read-bru-level.js';
import { rowsOfBru, variablesOfBru } from './read-bru-rows.js';
import { nodesOfBruDir } from './read-bru-tree.js';

const CONFIG_FILE = 'bruno.json';
const COLLECTION_FILE = 'collection.bru';
const ENVIRONMENTS = 'environments/';
const BRU = /\.bru$/iu;

/**
 * The collection a folder of `.bru` files is: `bruno.json` says what it is called,
 * `collection.bru` what it asks of every request, a directory is a folder (described by its
 * `folder.bru`) and a file in it a request, and the files of `environments/` are its environments.
 */
export function readBru(files: readonly InteropFile[]): BrunoDocument {
    const config = files.find((file) => file.path === CONFIG_FILE);

    if (config === undefined) {
        throw new BrunoParseError([`${CONFIG_FILE}: the file is missing`]);
    }

    const level = levelOfBru(files.find((file) => file.path === COLLECTION_FILE));
    const bru = files.filter((file) => file.path !== COLLECTION_FILE && BRU.test(file.path));
    const tree = dirTreeOf(
        bru.filter((file) => !file.path.startsWith(ENVIRONMENTS)),
        'folder.bru',
    );
    const skipped: BrunoSkipped[] = [];
    const name = textOf(documentRootOf(config.text)?.['name']);

    return {
        sourceId: documentSourceId(name),
        name,
        description: level.docs ?? '',
        headers: rowsOfBru(level.headers),
        auth: authOfBru(level.auth?.mode, level.auth),
        variables: variablesOfBru(level.vars?.req),
        children: nodesOfBruDir(tree, skipped),
        environments: bru
            .filter((file) => file.path.startsWith(ENVIRONMENTS))
            .map(environmentOfBru),
        skipped,
        leftOut: leftOutOf({ scripts: level.script, tests: level.tests }),
    };
}
