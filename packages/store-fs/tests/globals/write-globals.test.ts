import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readGlobals } from '../../src/globals/read-globals.js';
import { globalsTextWith, writeGlobals } from '../../src/globals/write-globals.js';
import { writeRepoTree } from '../../src/index.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-globals-'));

    await writeRepoTree(root, 'Mi repo');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

const HOST = { name: 'host', value: 'api.local', enabled: true, secret: false };
const TOKEN = { name: 'token', value: 's3cr3t', enabled: true, secret: true };

describe('writeGlobals', () => {
    it('writes the variables in the order given and keeps a secret value off the disk', async () => {
        await writeGlobals(root, { variables: [TOKEN, HOST] });

        const text = await readFile(join(root, 'globals.yaml'), 'utf8');

        expect(text).not.toContain('s3cr3t');
        expect(await readGlobals(root)).toEqual({ variables: [{ ...TOKEN, value: '' }, HOST] });
    });

    it('keeps the value of a name that was secret off the disk once unmarked', async () => {
        await writeGlobals(root, { variables: [TOKEN] });
        await writeGlobals(root, { variables: [{ ...TOKEN, secret: false }] });

        expect(await readFile(join(root, 'globals.yaml'), 'utf8')).not.toContain('s3cr3t');
    });

    it('keeps the comments and the keys it does not know', async () => {
        await writeFile(
            join(root, 'globals.yaml'),
            '# a mano\nvariables: []\nfuture: kept\n',
            'utf8',
        );

        await writeGlobals(root, { variables: [HOST] });

        const text = await readFile(join(root, 'globals.yaml'), 'utf8');

        expect(text).toContain('# a mano');
        expect(text).toContain('future: kept');
    });

    it('refuses to write over a file nobody can read', async () => {
        await writeFile(join(root, 'globals.yaml'), 'variables: [\n', 'utf8');

        await expect(writeGlobals(root, { variables: [HOST] })).rejects.toThrow();
        expect(await readFile(join(root, 'globals.yaml'), 'utf8')).toBe('variables: [\n');
    });
});

describe('globalsTextWith', () => {
    it('writes the text a window had with the list in it, a secret value off it', () => {
        const text = globalsTextWith('# a mano\nvariables: []\n', { variables: [HOST, TOKEN] });

        expect(text).toContain('# a mano');
        expect(text).toContain('name: host');
        expect(text).not.toContain('s3cr3t');
    });

    it('starts a file the window did not have', () => {
        expect(globalsTextWith(null, { variables: [TOKEN] })).toContain('secret: true');
        expect(globalsTextWith(null, { variables: [TOKEN] })).not.toContain('s3cr3t');
    });
});
