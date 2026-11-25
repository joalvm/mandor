// isolation-policy: simple-git warns about a setting once per process, and this file needs that first call.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { run } from '../../src/git/run.js';

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * Every call carries the settings that keep a checkout from making links. simple-git lets only
 * the settings it knows are harmless through without a word; the rest it names on the terminal
 * and will refuse in its next major version, which would turn the guard into a failure.
 */
describe('the settings every call of git carries', () => {
    it('passes them without a warning that they will be refused', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mandor-git-'));
        const warn = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

        try {
            await run(['--version'], root);
        } finally {
            await rm(root, { recursive: true, force: true });
        }

        expect(warn.mock.calls.map(([message]) => String(message))).not.toContainEqual(
            expect.stringContaining('simple-git'),
        );
    });
});
