import type { InteropInput } from '@mandor/interop-core';
import type { FileFilter, OpenDialogOptions } from 'electron';

import { lastDirectory, rememberLastDirectory } from '../dialogs/last-directory.js';
import { showOpenDialog } from '../dialogs/modal-dialog.js';
import type { ChooseDocument } from './choose-document.js';

type OpenKind = {
    properties: NonNullable<OpenDialogOptions['properties']>;
    /** A folder is not a file with an extension: the filters of the formats do not apply. */
    filtered: boolean;
};

const OPEN_KINDS: Record<InteropInput, OpenKind> = {
    file: { properties: ['openFile'], filtered: true },
    files: { properties: ['openFile', 'multiSelections'], filtered: true },
    folder: { properties: ['openDirectory'], filtered: false },
};

/**
 * The open dialog of the operating system, the only place something to import comes from.
 * Main never names a file by itself: a renderer that could name a path could name any path,
 * and the user picking it is the whole permission. What it opens from is the last folder the
 * user was in, so an import and an export find each other. Which files it offers is what the
 * caller lists: the host names no format.
 */
export function systemOpenDialog(filters: readonly FileFilter[]): ChooseDocument {
    return async (input) => {
        const last = await lastDirectory();
        const { properties, filtered } = OPEN_KINDS[input];
        const chosen = await showOpenDialog({
            ...(last === undefined ? {} : { defaultPath: last }),
            filters: filtered ? [...filters] : [],
            properties: [...properties],
        });

        const picked = chosen.filePaths[0];

        if (picked === undefined) {
            return null;
        }

        await rememberLastDirectory(picked);

        return chosen.filePaths;
    };
}
