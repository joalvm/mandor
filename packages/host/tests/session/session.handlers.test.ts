import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS, EMPTY_UI_SESSION, type Result, type UiSession } from '@mandor/ipc';
import { writeRepoTree } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { registerSessionHandlers } from '../../src/session/session.handlers.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

let dispose: () => void;
let ipc: IpcSpy;
let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-session-handler-'));
    await writeRepoTree(root, 'Demo');
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
    ipc = spyIpc();
    dispose = registerSessionHandlers(ipc);
});

afterEach(async () => {
    dispose();
    setActiveOrigin(null);
    await rm(root, { recursive: true, force: true });
});

function load(): Promise<Result<UiSession>> {
    return ipc.call(CHANNELS.sessionLoad) as Promise<Result<UiSession>>;
}

describe('the session handlers', () => {
    it('returns the empty contract before the renderer saves state', async () => {
        await expect(load()).resolves.toEqual({ ok: true, value: EMPTY_UI_SESSION });
    });

    /** A session that is not even YAML must not keep the origin from opening. */
    it('opens with the empty contract past a session file that is not YAML', async () => {
        await writeFile(join(root, '.mandor', 'session.yaml'), 'grid: [leaf\n', 'utf8');

        await expect(load()).resolves.toEqual({ ok: true, value: EMPTY_UI_SESSION });
    });

    it('validates, saves and reloads the renderer projection', async () => {
        const session: UiSession = {
            ...EMPTY_UI_SESSION,
            activeWorkspaceId: 'payments',
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

        await expect(ipc.call(CHANNELS.sessionSave, { session })).resolves.toEqual({
            ok: true,
            value: {},
        });
        await expect(load()).resolves.toEqual({ ok: true, value: session });
    });

    /** The session is read and written in the active origin; without one there is nowhere. */
    it('refuses to load while the window has no active origin', async () => {
        setActiveOrigin(null);

        await expect(load()).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses malformed state and removes both handlers on dispose', async () => {
        await expect(
            ipc.call(CHANNELS.sessionSave, { session: { tabs: 'many' } }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });

        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
