import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { systemSaveDialog } from '../../src/export/system-save-dialog.js';

// The dialog of the system does not exist in a test run. The double keeps its contract: the
// answer says whether the user cancelled, and carries the path when they did not.
const { showSaveDialog, getPath } = vi.hoisted(() => ({
    showSaveDialog: vi.fn<() => Promise<{ canceled: boolean; filePath: string }>>(),
    getPath: vi.fn<() => string>(),
}));

vi.mock('electron', () => ({ dialog: { showSaveDialog }, app: { getPath, isPackaged: false } }));

let userData: string;

const JSON_LINES = [{ name: 'JSON Lines', extensions: ['jsonl'] }];

function jsonLines() {
    return JSON_LINES;
}

const realSaveDir = process.env['MANDOR_SAVE_DIR'];

beforeEach(async () => {
    showSaveDialog.mockReset();
    userData = await mkdtemp(join(tmpdir(), 'mandor-dialog-'));
    getPath.mockReturnValue(userData);
});

afterEach(async () => {
    if (realSaveDir === undefined) {
        delete process.env['MANDOR_SAVE_DIR'];
    } else {
        process.env['MANDOR_SAVE_DIR'] = realSaveDir;
    }

    await rm(userData, { recursive: true, force: true });
});

describe('the save dialog of the system', () => {
    it('offers the suggested name and gives back the path the user chose', async () => {
        showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/home/user/run.jsonl' });

        await expect(systemSaveDialog(jsonLines)('activity.jsonl')).resolves.toBe(
            '/home/user/run.jsonl',
        );
        expect(showSaveDialog).toHaveBeenCalledWith({
            defaultPath: 'activity.jsonl',
            filters: JSON_LINES,
        });
    });

    it('offers the files the caller says the suggested name stands for', async () => {
        const filtersOf = vi.fn(() => [{ name: 'Fixture', extensions: ['json'] }]);

        showSaveDialog.mockResolvedValue({ canceled: true, filePath: '' });

        await systemSaveDialog(filtersOf)('pasarela.json');

        expect(filtersOf).toHaveBeenCalledWith('pasarela.json');
        expect(showSaveDialog).toHaveBeenCalledWith({
            defaultPath: 'pasarela.json',
            filters: [{ name: 'Fixture', extensions: ['json'] }],
        });
    });

    it('gives back nothing when the user closed the dialog', async () => {
        showSaveDialog.mockResolvedValue({ canceled: true, filePath: '' });

        await expect(systemSaveDialog(jsonLines)('activity.jsonl')).resolves.toBeNull();
    });

    /** A dialog that comes back with no path chose nothing, whatever it says about cancelling. */
    it('gives back nothing when the answer carries no path', async () => {
        showSaveDialog.mockResolvedValue({ canceled: false, filePath: '' });

        await expect(systemSaveDialog(jsonLines)('activity.jsonl')).resolves.toBeNull();
    });

    it('opens where the user was the last time, under the name it suggests', async () => {
        showSaveDialog.mockResolvedValueOnce({
            canceled: false,
            filePath: '/home/user/exports/run.jsonl',
        });
        await systemSaveDialog(jsonLines)('activity.jsonl');

        showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: '' });
        await systemSaveDialog(jsonLines)('activity.jsonl');

        expect(showSaveDialog).toHaveBeenLastCalledWith({
            defaultPath: join('/home/user/exports', 'activity.jsonl'),
            filters: JSON_LINES,
        });
    });

    /** Only ever set by the runs that stand in for the user; the app on a desk never sets it. */
    it('answers from the environment without showing the dialog when the run says so', async () => {
        process.env['MANDOR_SAVE_DIR'] = userData;

        await expect(systemSaveDialog(jsonLines)('pasarela.yaml')).resolves.toBe(
            join(userData, 'pasarela.yaml'),
        );
        expect(showSaveDialog).not.toHaveBeenCalled();
    });
});
