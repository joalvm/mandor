import { documentRootOf, isRecord, type InteropFile } from '@mandor/interop-core';

import { InsomniaParseError } from './insomnia-parse-error.js';

/** The two layouts Insomnia exports a collection in: a flat list of resources, and a tree. */
export type InsomniaVersion = 4 | 5;

const COLLECTION_V5 = 'collection.insomnia.rest/5.0';
const FILE_TYPE = /\.insomnia(?:\.rest)?\/\d/;
const EXPORT_AGAIN = 'export it again from a current Insomnia';

/**
 * Which layout this is, told by what is inside and never by the extension: v4 may be JSON or
 * YAML and v5 is YAML. Any other layout, and any v5 file that is not a collection, refuses with
 * the one sentence that says what to do about it.
 */
export function sniffInsomnia(root: unknown): InsomniaVersion {
    if (!isRecord(root)) {
        throw notInsomnia();
    }

    const type = root['type'];

    if (typeof type === 'string' && FILE_TYPE.test(type)) {
        return versionOfV5(type);
    }

    if (root['_type'] === 'export' && typeof root['__export_format'] === 'number') {
        return versionOfV4(root['__export_format']);
    }

    throw notInsomnia();
}

/**
 * Whether a text is an Insomnia file of any version, for the app that has to tell it from the
 * other formats it reads. A layout this app does not read counts: it is Insomnia, and reading
 * it says how to export it again.
 */
export function looksLikeInsomnia(text: string): boolean {
    const root = documentRootOf(text);

    if (root === null) {
        return false;
    }

    const type = root['type'];
    const isFileV5 = typeof type === 'string' && FILE_TYPE.test(type);

    return isFileV5 || (root['_type'] === 'export' && '__export_format' in root);
}

/** Whether every file is an Insomnia one: a collection with its environments is one import. */
export function looksLikeInsomniaFiles(files: readonly InteropFile[]): boolean {
    return files.length > 0 && files.every((file) => looksLikeInsomnia(file.text));
}

function versionOfV5(type: string): InsomniaVersion {
    if (type === COLLECTION_V5) {
        return 5;
    }

    throw new InsomniaParseError([
        `The Insomnia file "${type}" is not a collection: import the collection file of the project`,
    ]);
}

function versionOfV4(format: number): InsomniaVersion {
    if (format === 4) {
        return 4;
    }

    throw new InsomniaParseError([
        `The Insomnia export format ${String(format)} is not supported: ${EXPORT_AGAIN}`,
    ]);
}

function notInsomnia(): InsomniaParseError {
    return new InsomniaParseError(['This is not an Insomnia export (v4 or v5)']);
}
