import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { systemSaveFolder } from '../../src/export/system-save-folder.js';

// The dialog of the system does not exist in a test run. The double keeps its contract: the
// answer says whether the user cancelled, and carries the folder when they did not.
const { showOpenDialog, getPath } = vi.hoisted(() => ({
    showOpenDialog: vi.fn<() => Promise<{ canceled: boolean; filePaths: string[] }>>(),
    getPath: vi.fn<() => string>(),
}));

vi.mock('electron', () => ({ dialog: { showOpenDialog }, app: { getPath, isPackaged: false } }));

let userData: string;

const realSaveDir = process.env['MANDOR_SAVE_DIR'];

beforeEach(async () => {
    showOpenDialog.mockReset();
    userData = await mkdtemp(join(tmpdir(), 'mandor-folder-'));
    getPath.mockReturnValue(userData);
    delete process.env['MANDOR_SAVE_DIR'];
});

afterEach(async () => {
    if (realSaveDir === undefined) {
        delete process.env['MANDOR_SAVE_DIR'];
    } else {
        process.env['MANDOR_SAVE_DIR'] = realSaveDir;
    }

    await rm(userData, { recursive: true, force: true });
});

describe('the folder dialog of the system', () => {
    it('lets the user pick a folder, or make one, and gives back its path', async () => {
        showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/home/user/out'] });

        await expect(systemSaveFolder()()).resolves.toBe('/home/user/out');
        expect(showOpenDialog).toHaveBeenCalledWith({
            properties: ['openDirectory', 'createDirectory'],
        });
    });

    it('gives back nothing when the user closed the dialog', async () => {
        showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

        await expect(systemSaveFolder()()).resolves.toBeNull();
    });

    it('opens where the user was the last time', async () => {
        showOpenDialog.mockResolvedValueOnce({
            canceled: false,
            filePaths: ['/home/user/exports/api'],
        });
        await systemSaveFolder()();

        showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
        await systemSaveFolder()();

        expect(showOpenDialog).toHaveBeenLastCalledWith({
            defaultPath: '/home/user/exports',
            properties: ['openDirectory', 'createDirectory'],
        });
    });

    /** Only ever set by the runs that stand in for the user; the app on a desk never sets it. */
    it('answers from the environment without showing the dialog when the run says so', async () => {
        process.env['MANDOR_SAVE_DIR'] = userData;

        await expect(systemSaveFolder()()).resolves.toBe(userData);
        expect(showOpenDialog).not.toHaveBeenCalled();
    });
});
