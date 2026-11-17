import type { FileFilter } from 'electron';
import { join } from 'node:path';

import { lastDirectory, rememberLastDirectory } from '../dialogs/last-directory.js';
import { showSaveDialog } from '../dialogs/modal-dialog.js';
import type { ChooseSavePath } from './choose-save-path.js';
import { saveStandIn } from './save-stand-in.js';

/**
 * The save dialog of the operating system, the only place a path for the export comes from.
 * Main never invents one: a renderer that could name a file could name any file, and a path
 * the user did not pick is a file they did not agree to write. What it opens from is the last
 * folder the user was in, under the name the caller suggested, offering the files the caller
 * says that name stands for: the host names no format.
 */
export function systemSaveDialog(
    filtersOf: (suggestedName: string) => readonly FileFilter[],
): ChooseSavePath {
    return async (suggestedName) => {
        const standIn = saveStandIn();

        if (standIn !== null) {
            return join(standIn, suggestedName);
        }

        const last = await lastDirectory();
        const chosen = await showSaveDialog({
            defaultPath: last === undefined ? suggestedName : join(last, suggestedName),
            filters: [...filtersOf(suggestedName)],
        });

        if (chosen.canceled || chosen.filePath === '') {
            return null;
        }

        await rememberLastDirectory(chosen.filePath);

        return chosen.filePath;
    };
}
