import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { systemChooseNetworkFile } from '../../src/network/system-choose-network-file.js';

// The dialog of the system does not exist in a test run. The double keeps its contract: the
// answer says whether the user cancelled, and carries the paths when they did not.
const { showOpenDialog, getPath } = vi.hoisted(() => ({
    getPath: vi.fn<() => string>(),
    showOpenDialog:
        vi.fn<
            (options: {
                filters: { extensions: string[] }[];
            }) => Promise<{ canceled: boolean; filePaths: string[] }>
        >(),
}));

vi.mock('electron', () => ({ dialog: { showOpenDialog }, app: { getPath } }));

let userData: string;

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-choose-'));
    getPath.mockReturnValue(userData);
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

describe('the open dialog of a certificate file', () => {
    it('offers the extensions of the purpose and gives back the path picked', async () => {
        showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/home/ana/id.p12'] });

        await expect(systemChooseNetworkFile('pfx')).resolves.toBe('/home/ana/id.p12');
        expect(showOpenDialog.mock.lastCall?.[0].filters[0]?.extensions).toEqual(['pfx', 'p12']);
    });

    it('offers a key as PEM', async () => {
        showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/home/ana/k.pem'] });

        await systemChooseNetworkFile('key');

        expect(showOpenDialog.mock.lastCall?.[0].filters[0]?.extensions).toContain('key');
    });

    it('gives back null when the user changed their mind', async () => {
        showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

        await expect(systemChooseNetworkFile('ca')).resolves.toBeNull();
    });
});
