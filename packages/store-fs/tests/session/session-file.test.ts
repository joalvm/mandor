import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeRepoTree, readSession, writeSession } from '../../src/index.js';
import { sessionFile } from '../../src/session/session-path.js';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-session-'));
    await writeRepoTree(root, 'Demo');
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the private session file', () => {
    it('round-trips structured state as YAML under .mandor', async () => {
        const session = {
            version: 2,
            grid: {
                kind: 'leaf',
                id: 'root',
                tabs: [
                    { id: 'one', kind: 'doc', resource: 'mandor://demo/payments/doc/one.md' },
                    { id: 'two', kind: 'doc', resource: 'mandor://demo/payments/doc/two.md' },
                ],
                activeTab: 'two',
            },
        };

        await writeSession(root, session);

        expect(await readSession(root)).toEqual(session);
        expect(sessionFile(root)).toBe(join(root, '.mandor', 'session.yaml'));
        expect(await readFile(sessionFile(root), 'utf8')).toContain('activeTab: two');
    });

    /**
     * The window does not wait for one save before it sends the next. A big session sent first
     * takes longer to write than a small one sent after it, and must not land last.
     */
    it('keeps the last of overlapping saves, however long the earlier ones take', async () => {
        const big = { version: 2, note: 'x'.repeat(8 * 1024 * 1024) };
        const last = { version: 2, note: 'last' };

        await Promise.all([writeSession(root, big), writeSession(root, last)]);

        expect(await readSession(root)).toEqual(last);
    });

    it('returns no state before the first save', async () => {
        await expect(readSession(root)).resolves.toBeUndefined();
    });

    /** A hand that edited it can leave it so: a layout that cannot be read is no layout. */
    it('reads a file that is not YAML as no state', async () => {
        await writeFile(sessionFile(root), 'grid: [leaf\n', 'utf8');

        await expect(readSession(root)).resolves.toBeUndefined();
    });

    it('surfaces a read failure other than an absent file', async () => {
        await mkdir(sessionFile(root));

        await expect(readSession(root)).rejects.toThrow();
    });
});
