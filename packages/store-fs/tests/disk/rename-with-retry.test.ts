import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renameWithRetry } from '../../src/disk/rename-with-retry.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-rename-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('renaming a path the system may refuse for a moment', () => {
    it('moves a whole directory with what it holds', async () => {
        await mkdir(join(root, 'pedidos'));
        await writeFile(join(root, 'pedidos', 'folder.yaml'), 'name: Pedidos\n', 'utf8');

        await renameWithRetry(join(root, 'pedidos'), join(root, 'envios'));

        expect(await readdir(root)).toEqual(['envios']);
        expect(await readdir(join(root, 'envios'))).toEqual(['folder.yaml']);
    });

    it('hands back at once a refusal that will not pass', async () => {
        await expect(
            renameWithRetry(join(root, 'nowhere'), join(root, 'somewhere')),
        ).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
