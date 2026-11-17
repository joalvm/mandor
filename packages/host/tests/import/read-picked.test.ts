import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readPicked } from '../../src/import/read-picked.js';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mandor-picked-'));
});

afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
});

describe('reading what the user picked', () => {
    it('reads a file under its own name, not its path', async () => {
        await writeFile(join(dir, 'api.yaml'), 'openapi: 3.1.0', 'utf8');

        await expect(readPicked([join(dir, 'api.yaml')])).resolves.toEqual([
            { path: 'api.yaml', text: 'openapi: 3.1.0' },
        ]);
    });

    it('reads several files in the order they were picked', async () => {
        await writeFile(join(dir, 'b.har'), 'b', 'utf8');
        await writeFile(join(dir, 'a.har'), 'a', 'utf8');

        const read = await readPicked([join(dir, 'b.har'), join(dir, 'a.har')]);

        expect(read.map(({ path }) => path)).toEqual(['b.har', 'a.har']);
    });

    it('reads a folder into every file it holds, named by their path inside it', async () => {
        await mkdir(join(dir, 'api', 'users'), { recursive: true });
        await writeFile(join(dir, 'api', 'collection.json'), 'root', 'utf8');
        await writeFile(join(dir, 'api', 'users', 'list.json'), 'list', 'utf8');

        const read = await readPicked([join(dir, 'api')]);

        expect(read).toEqual([
            { path: 'collection.json', text: 'root' },
            { path: 'users/list.json', text: 'list' },
        ]);
    });

    it('leaves out what is never part of an import, however deep', async () => {
        await mkdir(join(dir, 'api', '.git'), { recursive: true });
        await mkdir(join(dir, 'api', 'node_modules'), { recursive: true });
        await writeFile(join(dir, 'api', '.git', 'HEAD'), 'ref', 'utf8');
        await writeFile(join(dir, 'api', 'node_modules', 'x.js'), 'x', 'utf8');
        await writeFile(join(dir, 'api', 'a.json'), 'a', 'utf8');

        const read = await readPicked([join(dir, 'api')]);

        expect(read.map(({ path }) => path)).toEqual(['a.json']);
    });

    /** A folder from somebody else can point at a key of this user; the import must not carry it. */
    it('follows no link inside a folder', async () => {
        await mkdir(join(dir, 'outside'), { recursive: true });
        await mkdir(join(dir, 'api'), { recursive: true });
        await writeFile(join(dir, 'outside', 'id_ed25519'), 'private key', 'utf8');
        await writeFile(join(dir, 'api', 'a.json'), 'a', 'utf8');
        // A junction on Windows needs no privilege; elsewhere the type is ignored and it is a link.
        await symlink(join(dir, 'outside'), join(dir, 'api', 'keys'), 'junction');

        const read = await readPicked([join(dir, 'api')]);

        expect(read).toEqual([{ path: 'a.json', text: 'a' }]);
    });

    it('reads however much was picked, and says how many files it has read', async () => {
        const seen: number[] = [];

        await Promise.all(
            Array.from({ length: 5001 }, (_, index) =>
                writeFile(join(dir, `${String(index)}.json`), 'x', 'utf8'),
            ),
        );

        const read = await readPicked([dir], {
            signal: new AbortController().signal,
            onRead: (files) => seen.push(files),
        });

        expect(read).toHaveLength(5001);
        expect(seen.at(-1)).toBe(5001);
    });

    /** A home folder picked by mistake: stopped, it must not leave the disk walked behind it. */
    it('stops walking and reading the moment the person stops it', async () => {
        const stop = new AbortController();
        const seen: number[] = [];

        await writeFile(join(dir, 'a.json'), 'a', 'utf8');
        await writeFile(join(dir, 'b.json'), 'b', 'utf8');

        await expect(
            readPicked([dir], {
                signal: stop.signal,
                onRead: (files) => {
                    seen.push(files);
                    stop.abort();
                },
            }),
        ).rejects.toMatchObject({ name: 'AbortError' });
        expect(seen).toEqual([1]);
    });

    it('fails when a picked path is gone, so the caller can say so', async () => {
        await expect(readPicked([join(dir, 'missing.json')])).rejects.toThrow(/ENOENT/u);
    });
});
