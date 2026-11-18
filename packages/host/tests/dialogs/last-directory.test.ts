import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getPath } = vi.hoisted(() => ({ getPath: vi.fn<() => string>() }));

vi.mock('electron', () => ({ app: { getPath } }));

import { lastDirectory, rememberLastDirectory } from '../../src/dialogs/last-directory.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-dirs-'));
    getPath.mockReturnValue(dir);
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('remembering the folder the user was last in', () => {
    it('answers nothing while nobody has been anywhere', async () => {
        await expect(lastDirectory()).resolves.toBeUndefined();
    });

    it('remembers the folder of the path the user chose, not the file', async () => {
        await rememberLastDirectory(join(dir, 'documentos', 'pasarela.yaml'));

        await expect(lastDirectory()).resolves.toBe(join(dir, 'documentos'));
    });

    it('answers nothing when what it kept cannot be read', async () => {
        await writeFile(join(dir, 'last-directory.json'), '<not json>', 'utf8');

        await expect(lastDirectory()).resolves.toBeUndefined();
    });

    it('answers nothing when what it kept names no folder', async () => {
        await writeFile(join(dir, 'last-directory.json'), JSON.stringify({ last: '' }), 'utf8');

        await expect(lastDirectory()).resolves.toBeUndefined();
    });

    it('loses the memory quietly when the data of the app cannot be written', async () => {
        getPath.mockReturnValue(join(dir, 'missing'));

        await expect(rememberLastDirectory(join(dir, 'a.yaml'))).resolves.toBeUndefined();
    });
});
