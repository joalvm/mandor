import {
    childrenInOrder,
    claimStem,
    listedRows,
    namedRowsOf,
    type FormatFile,
    type WorkspaceFolderNode,
} from '@mandor/interop-core';

import { authEntryOf } from './auth-document.js';
import { requestFilesOf, type Directory } from './request-files.js';
import { scriptBlocksOf } from './script-blocks.js';
import { variableDocumentsOf } from './variable-documents.js';

/** `folder.yml` is the file of the folder itself: no request can take its name. */
export const FOLDER_FILE = 'folder';

/**
 * A folder as a directory of Bruno: `folder.yml` says what it is called, where it stands, what it
 * declares and the scripts it runs for every request under it, and its folders and one file per
 * request sit beside it. `parent` is the directory it hangs from.
 */
export function folderFilesOf(
    folder: WorkspaceFolderNode,
    seq: number,
    parent: Directory,
): FormatFile[] {
    const stem = claimStem(folder.name, parent.taken, 'folder');
    const path = parent.path === '' ? stem : `${parent.path}/${stem}`;
    const directory: Directory = { path, taken: [FOLDER_FILE] };
    const { description, variables, auth, headers, scripts } = folder.settings;

    return [
        {
            path: `${path}/${FOLDER_FILE}.yml`,
            document: {
                info: { name: folder.name, type: 'folder', seq },
                ...(description === undefined ? {} : { docs: description }),
                request: {
                    ...listedRows('headers', namedRowsOf(headers)),
                    ...listedRows('variables', variableDocumentsOf(variables)),
                    ...authEntryOf(auth),
                    ...listedRows('scripts', scriptBlocksOf(scripts)),
                },
            },
        },
        ...levelFilesOf(folder, directory),
    ];
}

/** What a level holds, arranged as the person arranged it: `seq` is what Bruno sorts them by. */
export function levelFilesOf(level: WorkspaceFolderNode, directory: Directory): FormatFile[] {
    let seq = 0;

    return childrenInOrder<FormatFile>(level, {
        folder: (folder) => {
            seq += 1;

            return folderFilesOf(folder, seq, directory);
        },
        item: (item) => {
            const files = requestFilesOf([item], directory, seq + 1);

            seq += files.length;

            return files;
        },
    });
}
