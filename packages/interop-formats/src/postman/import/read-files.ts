import {
    FormatInputError,
    type ImportResource,
    type InteropDocument,
    type InteropFile,
    type InteropRead,
    withDocumentNotes,
} from '@mandor/interop-core';

import { parsePostmanDocument, type PostmanDocument } from '../document/parse-postman-document.js';
import type { PostmanKind } from '../document/sniff-postman.js';
import { documentToInterop } from './document-to-interop.js';
import { environmentResourceOf } from './environment-resource.js';
import { globalsResourceOf } from './globals-resource.js';
import { collectionResourcesOf } from './import-resources.js';
import { uniqueName } from './unique-name.js';

function ofKind(documents: readonly PostmanDocument[], kind: PostmanKind): InteropDocument[] {
    return documents.filter((document) => document.kind === kind).map(documentToInterop);
}

/** Two collections of one name would file in the same directory: the later takes `(2)`. */
function namedApart(collections: readonly InteropDocument[]): InteropDocument[] {
    const taken = new Set<string>();

    return collections.map((collection) => ({
        ...collection,
        name: uniqueName(taken, collection.name),
    }));
}

function readPostman(files: readonly InteropFile[]): InteropRead {
    const documents = files.map((file) => parsePostmanDocument(file.text));
    const collections = namedApart(ofKind(documents, 'collection'));
    const environments = ofKind(documents, 'environment');
    const globals = ofKind(documents, 'globals');
    const shared = globalsResourceOf(globals);
    const first = collections[0] ?? environments[0] ?? globals[0];

    if (first === undefined) {
        throw new FormatInputError(['there is no file to read']);
    }

    return {
        name: first.name,
        resources: [
            ...(shared === undefined ? [] : [shared]),
            ...environments
                .map(environmentResourceOf)
                .filter((resource): resource is ImportResource => resource !== undefined),
            ...collections.flatMap((collection) =>
                withDocumentNotes(collectionResourcesOf(collection), collection.notes),
            ),
        ],
    };
}

/**
 * A Postman import: the files the user picked, told apart by what is inside them. Each
 * collection becomes a collection of the workspace, with all it declares, and each environment an
 * environment; the globals are the globals of the origin and nothing else is made one. No file
 * writes on the workspace, which only takes its name from the first collection, else from the
 * first file.
 */
export function readFiles(files: readonly InteropFile[]): Promise<InteropRead> {
    return Promise.resolve().then(() => readPostman(files));
}
