import {
    childrenInOrder,
    type FormatDocument,
    type WorkspaceFolderNode,
} from '@mandor/interop-core';

import { folderSettingsDocumentOf } from './folder-settings-document.js';
import { requestDocumentOf } from './request-document.js';

/**
 * The folders of a level as Postman lists them: each with what it declares, its folders and its
 * requests. `above` is the levels over them, the closest first, whose headers the requests send.
 */
export function folderDocumentsOf(
    folders: readonly WorkspaceFolderNode[],
    above: readonly WorkspaceFolderNode[] = [],
): FormatDocument[] {
    return folders.map((folder) => {
        const chain = [folder, ...above];

        return {
            name: folder.name,
            ...folderSettingsDocumentOf(folder.settings),
            item: levelDocumentsOf(folder, chain),
        };
    });
}

/**
 * What a level holds as Postman lists it, arranged as the person arranged it. Only its requests:
 * the other kinds have no place in Postman.
 */
export function levelDocumentsOf(
    level: WorkspaceFolderNode,
    chain: readonly WorkspaceFolderNode[] = [level],
): FormatDocument[] {
    return childrenInOrder<FormatDocument>(level, {
        folder: (folder) => folderDocumentsOf([folder], chain),
        item: (item) =>
            [item]
                .filter(({ kind }) => kind === 'request')
                .map((request) => requestDocumentOf(request, chain)),
    });
}
