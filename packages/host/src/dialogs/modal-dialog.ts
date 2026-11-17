import {
    dialog,
    type BrowserWindow,
    type OpenDialogOptions,
    type OpenDialogReturnValue,
    type SaveDialogOptions,
    type SaveDialogReturnValue,
} from 'electron';

let parent: BrowserWindow | null = null;

/**
 * Hands the dialogs of the system the window they belong to. A dialog with a parent is modal to
 * it: the window waits instead of opening a second dialog under the first, and macOS draws it as
 * a sheet of the window instead of loose on the desktop. Answers how to take the window back.
 */
export function bindDialogParent(window: BrowserWindow): () => void {
    parent = window;

    return () => {
        if (parent === window) {
            parent = null;
        }
    };
}

/** The open dialog of the system, held by the window while there is one. */
export function showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
    if (parent === null) {
        return dialog.showOpenDialog(options);
    }

    return dialog.showOpenDialog(parent, options);
}

/** The save dialog of the system, held by the window while there is one. */
export function showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
    if (parent === null) {
        return dialog.showSaveDialog(options);
    }

    return dialog.showSaveDialog(parent, options);
}
