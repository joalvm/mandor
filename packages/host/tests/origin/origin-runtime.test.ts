import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PushTarget } from '../../src/ipc/push-to-window.js';
import {
    bindRuntimeWindow,
    closeOriginRuntime,
    openOriginRuntime,
} from '../../src/origin/origin-runtime.js';
import { flushCommits } from '../../src/repo/commit-scheduler.js';
import {
    announceConflictRecorded,
    announceConflictsChanged,
} from '../../src/repo/conflict-events.js';
import { knownText, rememberText } from '../../src/repo/known-texts.js';
import { silentReporting } from '../../src/testing/handler-harness.js';
import { tempRepo } from '../repo/support/temp-repo.js';

const repo = tempRepo();

const FILE = 'workspaces/pagos/workspace.yaml';

const { logger } = silentReporting();

type Sent = { channel: string; message: unknown };

function target(sent: Sent[]): PushTarget {
    return {
        isDestroyed: () => false,
        webContents: { send: (channel, message) => sent.push({ channel, message }) },
    };
}

afterEach(() => {
    closeOriginRuntime();
});

describe('the runtime of the open origin', () => {
    it('tells the window about a file written by hand and commits it', async () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        openOriginRuntime({ root: repo.root() }, logger);
        await mkdir(join(repo.root(), 'workspaces', 'pagos'), { recursive: true });
        await repo.write(FILE, 'name: Pagos\n');

        await vi.waitFor(() => {
            expect(sent).toContainEqual({
                channel: CHANNELS.repoChanged,
                message: { changes: [{ area: 'workspace', workspaceId: 'pagos' }] },
            });
        });
        await flushCommits(repo.root());
        unbind();

        expect(await repo.subjects()).toContain(`update ${FILE}`);
    });

    /** Electron throws when the frame of the window went away between the check and the send. */
    it('writes to the log an outside edit it could not tell the window about', async () => {
        const lines: string[] = [];
        const unbind = bindRuntimeWindow({
            isDestroyed: () => false,
            webContents: {
                send: () => {
                    throw new Error('Render frame was disposed');
                },
            },
        });

        openOriginRuntime(
            { root: repo.root() },
            { log: (_level, message) => lines.push(message), flush: () => Promise.resolve() },
        );
        await mkdir(join(repo.root(), 'workspaces', 'pagos'), { recursive: true });
        await repo.write(FILE, 'name: Pagos\n');

        await vi.waitFor(() => {
            expect(lines.join('\n')).toContain('Render frame was disposed');
        });
        unbind();
    });

    it('commits what it hears and says nothing while no window is bound', async () => {
        openOriginRuntime({ root: repo.root() }, logger);
        await repo.write('notes.txt', 'hola\n');

        await vi.waitFor(async () => {
            await flushCommits(repo.root());

            expect(await repo.subjects()).toContain('update notes.txt');
        });
    });

    it('forgets what the window believed when the origin is left', () => {
        rememberText(repo.root(), FILE, 'name: Pagos\n');

        openOriginRuntime({ root: repo.root() }, logger);
        closeOriginRuntime();

        expect(knownText(repo.root(), FILE)).toBeUndefined();
    });

    it('stops listening when closed, and closing twice is harmless', async () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        openOriginRuntime({ root: repo.root() }, logger);
        openOriginRuntime({ root: repo.root() }, logger);
        closeOriginRuntime();
        closeOriginRuntime();
        await repo.write('notes.txt', 'hola\n');
        unbind();

        expect(sent).toEqual([]);
    });
});

describe('the clashes the window hears about', () => {
    it('pushes the entity of the file that holds a clash and the name the file carries', async () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        await mkdir(join(repo.root(), 'workspaces', 'pagos', 'environments'), { recursive: true });
        await repo.write(
            'workspaces/pagos/environments/4t8k2m9x1c0d.yaml',
            'id: 4t8k2m9x1c0d\nname: Producción\n',
        );
        announceConflictRecorded(repo.root(), 'workspaces/pagos/environments/4t8k2m9x1c0d.yaml');
        await vi.waitFor(() => {
            expect(sent).toHaveLength(1);
        });
        unbind();

        expect(sent).toEqual([
            {
                channel: CHANNELS.conflictRecorded,
                message: {
                    entity: { area: 'environment', workspaceId: 'pagos', id: '4t8k2m9x1c0d' },
                    name: 'Producción',
                },
            },
        ]);
    });

    it('pushes an empty name when the file is gone or carries none', async () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        announceConflictRecorded('/r', 'workspaces/pagos/environments/prod.yaml');
        await vi.waitFor(() => {
            expect(sent).toHaveLength(1);
        });
        unbind();

        expect(sent[0]?.message).toEqual({
            entity: { area: 'environment', workspaceId: 'pagos', id: 'prod' },
            name: '',
        });
    });

    it('tells the window the list of clashes changed, only for the origin that is open', () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        openOriginRuntime({ root: repo.root() }, logger);
        announceConflictsChanged('/another-repo');
        announceConflictsChanged(repo.root());
        unbind();

        expect(sent).toEqual([{ channel: CHANNELS.conflictChanged, message: {} }]);
    });

    it('says nothing of a file outside the shape of a repo', () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        announceConflictRecorded('/r', 'notes.txt');
        unbind();

        expect(sent).toEqual([]);
    });

    it('stops at the unbind, and a window that was replaced is not spoken to', async () => {
        const old: Sent[] = [];
        const fresh: Sent[] = [];
        const unbindOld = bindRuntimeWindow(target(old));
        const unbindFresh = bindRuntimeWindow(target(fresh));

        announceConflictRecorded('/r', 'workspaces/pagos/workspace.yaml');
        await vi.waitFor(() => {
            expect(fresh).toHaveLength(1);
        });
        unbindOld();
        unbindFresh();
        announceConflictRecorded('/r', 'workspaces/pagos/workspace.yaml');

        expect(old).toEqual([]);
        expect(fresh).toHaveLength(1);
    });
});
