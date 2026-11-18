import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { sessionFile } from '../../src/session/session-path.js';
import { writeSession } from '../../src/session/write-session.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-write-session-'));
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('writing the private session', () => {
    it('creates the private directory and writes the state as YAML', async () => {
        await writeSession(root, { version: 2, activeTab: 'one' });

        const text = await readFile(sessionFile(root), 'utf8');

        expect(text).toContain('version: 2');
        expect(text).toContain('activeTab: one');
    });

    it('does not fold a long line, so the file diffs by line', async () => {
        const note = 'palabra '.repeat(40).trim();

        await writeSession(root, { note });

        expect(await readFile(sessionFile(root), 'utf8')).toBe(`note: ${note}\n`);
    });

    it('replaces the previous session whole and leaves no temporary file behind', async () => {
        await writeSession(root, { version: 1, old: true });
        await writeSession(root, { version: 2 });

        expect(await readFile(sessionFile(root), 'utf8')).toBe('version: 2\n');
        expect(await readdir(dirname(sessionFile(root)))).toEqual(['session.yaml']);
    });

    /** Saves are sent without waiting: the last one sent is the one that must land last. */
    it('lands saves in the order they were sent', async () => {
        const big = { version: 1, note: 'x'.repeat(2 * 1024 * 1024) };

        await Promise.all([writeSession(root, big), writeSession(root, { version: 2 })]);

        expect(await readFile(sessionFile(root), 'utf8')).toBe('version: 2\n');
    });
});
