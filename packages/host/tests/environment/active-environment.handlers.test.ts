import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { activeEnvironmentsFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerActiveEnvironmentHandlers } from '../../src/environment/active-environment.handlers.js';
import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

let ipc: IpcSpy;
let dispose: () => void;
let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-active-'));
    ipc = spyIpc();
    dispose = registerActiveEnvironmentHandlers(ipc);
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
});

afterEach(async () => {
    dispose();
    await rm(root, { recursive: true, force: true });
});

describe('the environment each workspace has active', () => {
    /** The choices are read and written whole: saves that overlap must not drop each other. */
    it('keeps the choice of every workspace when saves overlap', async () => {
        const workspaces = Array.from({ length: 10 }, (_value, index) => `ws-${String(index)}`);

        await Promise.all(
            workspaces.map((workspaceId) =>
                ipc.call(CHANNELS.environmentActiveSave, { workspaceId, environmentId: 'prod' }),
            ),
        );

        await expect(ipc.call(CHANNELS.environmentActiveLoad, {})).resolves.toEqual({
            ok: true,
            value: Object.fromEntries(workspaces.map((workspaceId) => [workspaceId, 'prod'])),
        });
    });

    /**
     * The file is private and only says which environment each workspace had picked. One that a
     * crash cut short or a hand broke must not leave the person unable to pick one ever again.
     */
    it.each([
        ['is not YAML', 'payments: [local\n', {}],
        ['holds what is not a choice', 'payments: 5\nevents: staging\n', { events: 'staging' }],
        ['is not a map', '- payments\n', {}],
    ])('loads and saves again past a file that %s', async (_case, text, kept) => {
        await mkdir(join(root, '.mandor'), { recursive: true });
        await writeFile(activeEnvironmentsFile(root), text, 'utf8');

        await expect(
            ipc.call(CHANNELS.environmentActiveSave, {
                workspaceId: 'orders',
                environmentId: 'prod',
            }),
        ).resolves.toEqual({ ok: true, value: {} });
        await expect(ipc.call(CHANNELS.environmentActiveLoad, {})).resolves.toEqual({
            ok: true,
            value: { ...kept, orders: 'prod' },
        });
    });
});
