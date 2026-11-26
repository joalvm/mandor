import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { rememberOrigin } from '../../src/origin/origins.js';
import { storedOriginById } from '../../src/origin/stored-origin-by-id.js';
import type { StoredOrigin } from '../../src/origin/stored-origin.js';

let userData: string;

const LOCAL: StoredOrigin = {
    id: 'local',
    name: 'Local',
    kind: 'local',
    root: 'C:/Mandor/realtime/local',
};

beforeEach(async () => {
    userData = await mkdtemp(join(tmpdir(), 'mandor-user-'));
    await rememberOrigin(userData, LOCAL);
});

afterEach(async () => {
    await rm(userData, { recursive: true, force: true });
});

describe('the origin an id names', () => {
    it('hands back the origin the list keeps under the id', async () => {
        await expect(storedOriginById(userData, 'local')).resolves.toEqual({
            ok: true,
            value: LOCAL,
        });
    });

    it('refuses an id the list does not keep, as a bad request that names it', async () => {
        const answer = await storedOriginById(userData, 'ausente');

        expect(answer.ok ? '' : answer.error.code).toBe('bad-request');
        expect(answer.ok ? '' : answer.error.message).toBe('unknown origin: ausente');
    });
});
