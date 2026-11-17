import {
    FormatInputError,
    nameOr,
    namedApart,
    type InteropFile,
    type InteropRead,
} from '@mandor/interop-core';

import { parseInsomniaDocument } from '../document/parse-insomnia-document.js';
import { collectionResourcesOf } from './collection-resources.js';
import { connectionResourcesOf } from './connection-resources.js';
import { workspaceResourcesOf } from './environment-resources.js';

function readInsomnia(files: readonly InteropFile[]): InteropRead {
    const parsed = files.flatMap((file) => parseInsomniaDocument(file.text));
    const [first] = parsed;

    if (first === undefined) {
        throw new FormatInputError(['there is no file to read']);
    }

    const documents = namedApart(parsed, 'Insomnia');

    return {
        name: nameOr(first.name, 'Insomnia'),
        resources: [
            ...workspaceResourcesOf(documents),
            ...connectionResourcesOf(documents),
            ...documents.flatMap(collectionResourcesOf),
        ],
    };
}

/**
 * An Insomnia import: the files the user picked, each one a collection with its environments
 * (v4 or v5, JSON or YAML). Each collection becomes a collection of the workspace, its base
 * environment the variables of that collection and the others its environments. The
 * workspace takes its name from the first collection.
 */
export function readFiles(files: readonly InteropFile[]): Promise<InteropRead> {
    return Promise.resolve().then(() => readInsomnia(files));
}
