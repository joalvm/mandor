import { lastDirectory, rememberLastDirectory } from '../dialogs/last-directory.js';
import { showOpenDialog } from '../dialogs/modal-dialog.js';
import type { ChooseSaveFolder } from './choose-save-folder.js';
import { saveStandIn } from './save-stand-in.js';

/**
 * The folder dialog of the operating system, the only place the folder for an export of several
 * files comes from. Like the save dialog it opens where the user was last, and the path is the
 * user's pick: main never invents one.
 */
export function systemSaveFolder(): ChooseSaveFolder {
    return async () => {
        const standIn = saveStandIn();

        if (standIn !== null) {
            return standIn;
        }

        const last = await lastDirectory();
        const chosen = await showOpenDialog({
            ...(last === undefined ? {} : { defaultPath: last }),
            properties: ['openDirectory', 'createDirectory'],
        });

        const picked = chosen.filePaths[0];

        if (picked === undefined) {
            return null;
        }

        await rememberLastDirectory(picked);

        return picked;
    };
}
