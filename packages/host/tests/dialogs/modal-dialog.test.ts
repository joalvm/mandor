import { BrowserWindow } from 'electron';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    bindDialogParent,
    showOpenDialog,
    showSaveDialog,
} from '../../src/dialogs/modal-dialog.js';

const { dialog } = vi.hoisted(() => ({
    dialog: {
        showOpenDialog: vi.fn(() => Promise.resolve({ canceled: true, filePaths: [] })),
        showSaveDialog: vi.fn(() => Promise.resolve({ canceled: true, filePath: '' })),
    },
}));

// A window keeps what it was built with: two windows read apart where a test compares them.
vi.mock('electron', () => ({
    BrowserWindow: class {
        options: unknown;

        constructor(options: unknown) {
            this.options = options;
        }
    },
    dialog,
}));

const WINDOW = new BrowserWindow({ title: 'first' });
const OPEN = { properties: ['openFile' as const] };
const SAVE = { defaultPath: 'run.jsonl' };

beforeEach(() => {
    dialog.showOpenDialog.mockClear();
    dialog.showSaveDialog.mockClear();
});

describe('the dialogs of the system', () => {
    it('stand alone while no window is bound', async () => {
        await showOpenDialog(OPEN);
        await showSaveDialog(SAVE);

        expect(dialog.showOpenDialog).toHaveBeenCalledWith(OPEN);
        expect(dialog.showSaveDialog).toHaveBeenCalledWith(SAVE);
    });

    it('belong to the bound window, which waits for them', async () => {
        const release = bindDialogParent(WINDOW);

        await showOpenDialog(OPEN);
        await showSaveDialog(SAVE);
        release();

        expect(dialog.showOpenDialog).toHaveBeenCalledWith(WINDOW, OPEN);
        expect(dialog.showSaveDialog).toHaveBeenCalledWith(WINDOW, SAVE);
    });

    it('stand alone again once the window is taken back', async () => {
        bindDialogParent(WINDOW)();

        await showOpenDialog(OPEN);

        expect(dialog.showOpenDialog).toHaveBeenCalledWith(OPEN);
    });

    it('keep the newer window when an older one is taken back late', async () => {
        const older = bindDialogParent(WINDOW);
        const newer = new BrowserWindow({ title: 'newer' });
        const release = bindDialogParent(newer);

        older();
        await showOpenDialog(OPEN);
        release();

        expect(dialog.showOpenDialog).toHaveBeenCalledWith(newer, OPEN);
    });
});
