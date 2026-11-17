import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initRepo as initGitRepo, status } from '@mandor/git';
import { writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    forgetSecret,
    readSecretIndex,
    rememberSecret,
    secretIndexFile,
} from '../../src/secret/secret-index.js';

const KEY = 'team-api/payments/prod/TOKEN';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-secret-index-'));
    // The suite has to see the same git on every machine, and CI runners carry no identity.
    process.env['GIT_CONFIG_GLOBAL'] = join(root, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(root, 'no-system-config');
    process.env['GIT_AUTHOR_NAME'] = 'Mandor Test';
    process.env['GIT_AUTHOR_EMAIL'] = 'test@mandor.local';
    process.env['GIT_COMMITTER_NAME'] = 'Mandor Test';
    process.env['GIT_COMMITTER_EMAIL'] = 'test@mandor.local';
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the index of secrets kept on this machine', () => {
    it('lives inside the private directory of the repo', () => {
        expect(secretIndexFile(root)).toBe(join(root, '.mandor', 'secret-index.json'));
    });

    /** Each call reads the whole index and writes it back: two at once must not lose either key. */
    it('keeps every key of calls that overlap', async () => {
        const keys = Array.from({ length: 10 }, (_value, index) => `${KEY}-${String(index)}`);

        await Promise.all(keys.map((key) => rememberSecret(root, key)));

        await expect(readSecretIndex(root)).resolves.toEqual([...keys].sort());
    });

    it('answers with nothing before anything was kept', async () => {
        await expect(readSecretIndex(root)).resolves.toEqual([]);
    });

    /** Read as empty, the next key remembered would rewrite the index with that key alone. */
    it('fails on an index that is there but cannot be read', async () => {
        await mkdir(secretIndexFile(root), { recursive: true });

        await expect(readSecretIndex(root)).rejects.toThrow();
    });

    it('remembers a key once, however many times it is written', async () => {
        await rememberSecret(root, KEY);
        await rememberSecret(root, KEY);

        await expect(readSecretIndex(root)).resolves.toEqual([KEY]);
    });

    it('forgets the key it was told to and keeps the others', async () => {
        await rememberSecret(root, KEY);
        await rememberSecret(root, 'team-api/payments/prod/OTHER');

        await forgetSecret(root, KEY);

        await expect(readSecretIndex(root)).resolves.toEqual(['team-api/payments/prod/OTHER']);
    });

    /** The whole point of the index: which variables have a value here, and never the value. */
    it('writes the key and nothing that could be a value', async () => {
        await rememberSecret(root, KEY);

        const written = await readFile(secretIndexFile(root), 'utf8');

        expect(written).toContain(KEY);
        expect(JSON.parse(written)).toEqual({ keys: [KEY] });
    });

    /** What is written here never reaches the origin of the user, and git is what says so. */
    it('leaves a repo clean, because git ignores the private directory', async () => {
        await writeRepoTree(root, 'Demo');
        await initGitRepo(root);

        await rememberSecret(root, KEY);

        await expect(status(root)).resolves.toMatchObject({ clean: true });
    });
});
