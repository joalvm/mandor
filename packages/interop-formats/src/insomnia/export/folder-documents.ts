import {
    childrenInOrder,
    listedRows,
    namedRowsOf,
    type FormatDocument,
    type WorkspaceFolderNode,
} from '@mandor/interop-core';
import type { CollectionItem, ConcreteAuth } from '@mandor/schema';

import { authDocumentOf } from './auth-document.js';
import { dataOf } from './environment-document.js';
import { insomniaIdOf } from './insomnia-id.js';
import { withReferences } from './reference-of.js';
import { requestDocumentOf } from './request-document.js';
import { scriptsDocumentOf } from './scripts-document.js';

function requestsOf(items: readonly CollectionItem[], where: readonly string[]): FormatDocument[] {
    return items
        .filter((item) => item.kind === 'request')
        .map((item) => requestDocumentOf(item, where, undefined));
}

/**
 * The folders of a level as Insomnia lists them, each with what it declares: its description, its
 * variables, its headers, its auth and its scripts. `where` is the path of names that leads to the level, which
 * gives each one an id that survives the next export.
 * `above` is what the first level speaks when it speaks none: the collection and the workspace,
 * which Insomnia has no place for. Below it, a folder inherits by itself.
 */
export function folderDocumentsOf(
    folders: readonly WorkspaceFolderNode[],
    where: readonly string[],
    above: ConcreteAuth | undefined,
): FormatDocument[] {
    return folders.map((folder) => {
        const { description, variables, headers } = folder.settings;
        const auth = folder.settings.auth ?? above;
        const here = [...where, folder.name];

        return {
            name: folder.name,
            meta: {
                id: insomniaIdOf('fld', ...here),
                ...(description === undefined ? {} : { description }),
            },
            ...(auth === undefined ? {} : { authentication: withReferences(authDocumentOf(auth)) }),
            ...listedRows('headers', withReferences(namedRowsOf(headers))),
            ...(variables.length === 0 ? {} : { environment: dataOf(variables) }),
            ...scriptsDocumentOf(folder.settings.scripts),
            children: childrenInOrder<FormatDocument>(folder, {
                folder: (child) => folderDocumentsOf([child], here, undefined),
                item: (item) => requestsOf([item], here),
            }),
        };
    });
}
