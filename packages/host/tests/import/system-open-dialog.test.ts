import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { systemOpenDialog } from '../../src/import/system-open-dialog.js';

// The dialog of the system does not exist in a test run. The double keeps its contract: the
// answer says whether the user cancelled, and carries the paths when they did not.
const { showOpenDialog, getPath } = vi.hoisted(() => ({
    showOpenDialog: vi.fn<() => Promise<{ canceled: boolean; filePaths: string[] }>>(),
    getPath: vi.fn<() => string>(),
}));

vi.mock('electron', () => ({ dialog: { showOpenDialog }, app: { getPath } }));

let userData: string;

const FILTERS = [{ name: 'Fixture', extensions: ['json'] }];

beforeEach(async () => {
    showOpenDialog.mockReset();
    userData = await mkdtemp(join(tmpdir(), 'mandor-open-'));
    getPath.mockReturnValue(userData);
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

describe('the open dialog of the system', () => {
    it('offers the filters it was given and gives back the path the user chose', async () => {
        showOpenDialog.mockResolvedValue({
            canceled: false,
            filePaths: ['/home/user/pasarela.yaml'],
        });

        await expect(systemOpenDialog(FILTERS)('file')).resolves.toEqual([
            '/home/user/pasarela.yaml',
        ]);
        expect(showOpenDialog).toHaveBeenCalledWith({
            filters: FILTERS,
            properties: ['openFile'],
        });
    });

    it('lets the user pick several files when the format reads several', async () => {
        showOpenDialog.mockResolvedValue({
            canceled: false,
            filePaths: ['/home/user/a.har', '/home/user/b.har'],
        });

        await expect(systemOpenDialog(FILTERS)('files')).resolves.toEqual([
            '/home/user/a.har',
            '/home/user/b.har',
        ]);
        expect(showOpenDialog).toHaveBeenCalledWith({
            filters: FILTERS,
            properties: ['openFile', 'multiSelections'],
        });
    });

    it('asks for a folder, with no filter, when the format reads a folder', async () => {
        showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/home/user/api'] });

        await expect(systemOpenDialog(FILTERS)('folder')).resolves.toEqual(['/home/user/api']);
        expect(showOpenDialog).toHaveBeenCalledWith({
            filters: [],
            properties: ['openDirectory'],
        });
    });

    it('gives back nothing when the user closed the dialog', async () => {
        showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

        await expect(systemOpenDialog(FILTERS)('file')).resolves.toBeNull();
    });

    it('opens where the user was the last time, and remembers where they went', async () => {
        showOpenDialog.mockResolvedValueOnce({
            canceled: false,
            filePaths: ['/home/user/docs/pasarela.yaml'],
        });
        await systemOpenDialog(FILTERS)('file');

        showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
        await systemOpenDialog(FILTERS)('file');

        expect(showOpenDialog).toHaveBeenLastCalledWith({
            defaultPath: '/home/user/docs',
            filters: FILTERS,
            properties: ['openFile'],
        });
    });
});
