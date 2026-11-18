import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readSession } from '../../src/session/read-session.js';
import { sessionFile } from '../../src/session/session-path.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-read-session-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('reading the private session', () => {
    it('answers nothing when no session was ever saved', async () => {
        await expect(readSession(root)).resolves.toBeUndefined();
    });

    it('answers the data of the file untouched, for its owner to validate', async () => {
        await mkdir(dirname(sessionFile(root)), { recursive: true });
        await writeFile(sessionFile(root), 'version: 2\ngrid:\n  kind: leaf\n', 'utf8');

        await expect(readSession(root)).resolves.toEqual({ version: 2, grid: { kind: 'leaf' } });
    });

    it('answers nothing for a file that is not YAML', async () => {
        await mkdir(dirname(sessionFile(root)), { recursive: true });
        await writeFile(sessionFile(root), 'grid: [leaf\n', 'utf8');

        await expect(readSession(root)).resolves.toBeUndefined();
    });

    it('fails when the path is there and cannot be read as a file', async () => {
        await mkdir(sessionFile(root), { recursive: true });

        await expect(readSession(root)).rejects.toThrow();
    });
});
