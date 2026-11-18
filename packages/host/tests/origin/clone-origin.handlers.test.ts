import { join } from 'node:path';

import { CHANNELS, type OpenedOrigin, type Result } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rememberOrigin } from '../../src/origin/origins.js';
import {
    bareLog,
    bareOrigin,
    publishMandorRepo,
    publishForeignFile,
    type BareOrigin,
} from '../support/bare-origin.js';
import {
    localOriginRepo,
    setupOriginHandlers,
    teardownOriginHandlers,
    type OriginHandlersFixture,
} from './origin-handlers-fixture.js';

vi.mock('electron', async () => ({
    app: { getPath: () => '' },
    safeStorage: (await import('../support/safe-storage-double.js')).safeStorageDouble({
        available: () => false,
    }),
}));

const localRepo = localOriginRepo();

let fixture: OriginHandlersFixture;
let team: string;

beforeEach(async () => {
    fixture = await setupOriginHandlers(localRepo);
    team = join(fixture.base, 'team');
});

afterEach(async () => {
    await teardownOriginHandlers(fixture);
});

async function rememberTeam(url: string): Promise<void> {
    await rememberOrigin(fixture.userData, {
        id: 'team',
        kind: 'remote',
        name: 'Team',
        root: team,
        url,
    });
}

function switchToTeam(): Promise<Result<OpenedOrigin>> {
    return fixture.ipc.call(CHANNELS.originSwitch, { id: 'team' }) as Promise<Result<OpenedOrigin>>;
}

async function remoteWith(publish: (bare: BareOrigin) => Promise<void>): Promise<BareOrigin> {
    const bare = await bareOrigin(fixture.base, 'team');

    await publish(bare);
    await rememberTeam(bare.url);

    return bare;
}

describe('opening a remote origin that has no copy on this machine', () => {
    it('brings the work the origin holds', async () => {
        await remoteWith((bare) => publishMandorRepo(fixture.base, bare, 'Team'));

        const answer = await switchToTeam();

        expect(answer).toMatchObject({
            ok: true,
            value: { repo: { name: 'Team' }, workspaces: [{ name: 'Del remoto' }] },
        });
        expect(await fixture.exists(team, '.git')).toBe(true);
        expect(await fixture.exists(`${team}.partial`)).toBe(false);
    });

    it('starts an empty repo for an origin with nothing in it, and publishes it', async () => {
        const bare = await remoteWith(() => Promise.resolve());

        const answer = await switchToTeam();

        expect(answer).toMatchObject({
            ok: true,
            value: { repo: { name: 'Team' }, workspaces: [] },
        });
        expect(await bareLog(bare)).toEqual(['init repo']);
    });

    it('does not clone again an origin that already has its copy', async () => {
        await remoteWith((bare) => publishMandorRepo(fixture.base, bare, 'Team'));
        await switchToTeam();

        const second = await switchToTeam();

        expect(second).toMatchObject({ ok: true, value: { workspaces: [{ name: 'Del remoto' }] } });
    });

    it('refuses an origin with content that is not from Mandor, and leaves nothing', async () => {
        await remoteWith((bare) => publishForeignFile(fixture.base, bare));

        await expect(switchToTeam()).resolves.toMatchObject({
            ok: false,
            error: { code: 'origin-foreign' },
        });
        expect(await fixture.exists(team)).toBe(false);
        expect(await fixture.exists(`${team}.partial`)).toBe(false);
    });

    it('refuses an origin that does not answer, and leaves nothing behind', async () => {
        const gone = await bareOrigin(fixture.base, 'gone');

        await rememberTeam(gone.url.replace('gone', 'nowhere'));

        await expect(switchToTeam()).resolves.toMatchObject({
            ok: false,
            error: { code: 'origin-unreachable' },
        });
        expect(await fixture.exists(team)).toBe(false);
        expect(await fixture.exists(`${team}.partial`)).toBe(false);
    });
});
