import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { graphqlSchemaFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readSchemaCache, writeSchemaCache } from '../../../../src/main/graphql/schema-cache.js';

const KEY = 'c'.repeat(64);
const CACHE = {
    fetchedAt: '2026-10-01T14:02:00.000Z',
    introspection: { __schema: { queryType: { name: 'Query' } } },
};

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-schema-cache-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('keeping the schema of a server', () => {
    it('reads back what it wrote, from the file named by the key', async () => {
        await writeSchemaCache(root, 'payments', KEY, CACHE);

        const file = graphqlSchemaFile(root, 'payments', KEY);

        expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(CACHE);
        expect(await readSchemaCache(root, 'payments', KEY)).toEqual(CACHE);
    });

    it('keeps it under .mandor, which never goes to git', () => {
        expect(graphqlSchemaFile(root, 'payments', KEY)).toContain(join(root, '.mandor'));
    });

    it('replaces what was kept for the key', async () => {
        await writeSchemaCache(root, 'payments', KEY, CACHE);
        await writeSchemaCache(root, 'payments', KEY, {
            ...CACHE,
            fetchedAt: '2026-10-02T09:00:00.000Z',
        });

        expect((await readSchemaCache(root, 'payments', KEY))?.fetchedAt).toBe(
            '2026-10-02T09:00:00.000Z',
        );
    });

    it('answers nothing when nothing was ever kept', async () => {
        expect(await readSchemaCache(root, 'payments', KEY)).toBeNull();
    });

    it.each([
        ['cut short', '{"fetchedAt": '],
        ['of another shape', '{"fetchedAt":"2026-10-01T14:02:00.000Z","introspection":{}}'],
    ])(
        'answers nothing for a file %s: asking the server again rebuilds it',
        async (_name, text) => {
            const file = graphqlSchemaFile(root, 'payments', KEY);

            await mkdir(dirname(file), { recursive: true });
            await writeFile(file, text);

            expect(await readSchemaCache(root, 'payments', KEY)).toBeNull();
        },
    );

    it('refuses a key that is not a hash, before touching the disk', async () => {
        await expect(writeSchemaCache(root, 'payments', '../x', CACHE)).rejects.toThrow();
        expect(await readSchemaCache(root, 'payments', '../x')).toBeNull();
    });
});
