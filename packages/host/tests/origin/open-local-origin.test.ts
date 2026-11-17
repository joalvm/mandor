import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANGUAGE } from '@mandor/i18n';

import type { Logger } from '../../src/log/create-logger.js';
import { activeOrigin, setActiveOrigin } from '../../src/origin/active-origin.js';
import { openLocalOrigin } from '../../src/origin/open-local-origin.js';
import { closeOriginRuntime } from '../../src/origin/origin-runtime.js';
import { listOrigins } from '../../src/origin/origins.js';

vi.mock('electron', async () => ({
    app: { getPath: () => '' },
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble(),
}));

let base: string;
let userData: string;
let logged: string[];
let logger: Logger;

beforeEach(async () => {
    base = await mkdtemp(join(tmpdir(), 'mandor-local-'));
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    logged = [];
    logger = {
        log: (_level, message) => logged.push(message),
        flush: () => Promise.resolve(),
    };

    process.env['MANDOR_DEFAULT_REPO_ROOT'] = join(base, 'container');
    process.env['GIT_CONFIG_GLOBAL'] = join(base, 'no-global-config');
    process.env['GIT_CONFIG_SYSTEM'] = join(base, 'no-system-config');
});

afterEach(async () => {
    closeOriginRuntime();
    setActiveOrigin(null);
    delete process.env['MANDOR_DEFAULT_REPO_ROOT'];

    await rm(base, { recursive: true, force: true });
    await rm(userData, { recursive: true, force: true });
});

describe('opening the local origin at the start of the app', () => {
    it('lays the repo out, remembers the origin and makes it the active one', async () => {
        await openLocalOrigin('sync', userData, logger, DEFAULT_LANGUAGE);

        const stored = await listOrigins(userData);

        expect(activeOrigin()).toMatchObject({ id: 'local', name: 'Local', kind: 'local' });
        expect(activeOrigin()?.root).toBe(join(base, 'container', 'sync', 'local'));
        expect(stored.map((each) => each.id)).toContain('local');
        expect(logged).toEqual([]);
    });

    it('logs the failure and starts with no origin when the repo cannot be laid out', async () => {
        await writeFile(join(base, 'container'), 'a file where the container should be', 'utf8');

        await openLocalOrigin('async', userData, logger, DEFAULT_LANGUAGE);

        expect(activeOrigin()).toBeNull();
        expect(logged).toHaveLength(1);
        expect(logged[0]).toContain('could not be opened');
    });
});
