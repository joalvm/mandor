import {
    FormatInputError,
    nameOr,
    namedApart,
    type InteropFile,
    type InteropRead,
} from '@mandor/interop-core';

import { parseBrunoFiles } from '../document/parse-bruno-files.js';
import { collectionResourcesOf } from './collection-resources.js';
import { connectionResourcesOf } from './connection-resources.js';
import { workspaceResourcesOf } from './workspace-resources.js';

function readBruno(files: readonly InteropFile[]): InteropRead {
    const parsed = parseBrunoFiles(files);
    const [first] = parsed;

    if (first === undefined) {
        throw new FormatInputError(['the folder holds no collection of Bruno']);
    }

    const documents = namedApart(parsed, 'Bruno');

    return {
        name: nameOr(first.name, 'Bruno'),
        resources: [
            ...workspaceResourcesOf(documents),
            ...connectionResourcesOf(documents),
            ...documents.flatMap(collectionResourcesOf),
        ],
    };
}

/**
 * A Bruno import: the files of the folder the user picked, which holds one collection or
 * several, in OpenCollection or in `.bru`. Each collection becomes a collection of the
 * workspace with its own auth, and their environments are the environments of the workspace. The
 * workspace takes its name from the first collection.
 */
export function readFiles(files: readonly InteropFile[]): Promise<InteropRead> {
    return Promise.resolve().then(() => readBruno(files));
}
