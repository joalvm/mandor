import { CHANNELS } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PushTarget } from '../../src/ipc/push-to-window.js';
import {
    bindRuntimeWindow,
    closeOriginRuntime,
    openOriginRuntime,
    openSyncState,
    requestSync,
} from '../../src/origin/origin-runtime.js';
import { silentReporting } from '../../src/testing/handler-harness.js';
import { tempRepo } from '../repo/support/temp-repo.js';

const repo = tempRepo();

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

describe('the synchronization of the open origin', () => {
    it('tells the window the local origin has nothing to follow', () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        openOriginRuntime({ root: repo.root() }, logger, {
            name: 'Team',
            kind: 'local',
            access: () => Promise.reject(new Error('no remote')),
        });
        unbind();

        expect(sent).toEqual([
            {
                channel: CHANNELS.originStateChanged,
                message: { state: 'local-only', busy: false },
            },
        ]);
        expect(openSyncState()).toEqual({ state: 'local-only', busy: false });
    });

    it('says error when the remote cannot be reached, and works while it tries', async () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        openOriginRuntime({ root: repo.root() }, logger, {
            name: 'Team',
            kind: 'remote',
            access: () => Promise.reject(new Error('no network')),
        });

        await vi.waitFor(() => {
            expect(openSyncState()).toEqual({ state: 'error', busy: false });
        });
        unbind();

        expect(sent.map((each) => each.message)).toEqual([
            { state: 'clean', busy: true },
            { state: 'error', busy: false },
        ]);
    });

    it('has no state when no loop follows the origin, and forgets it once closed', () => {
        openOriginRuntime({ root: repo.root() }, logger);

        expect(openSyncState()).toBeNull();

        openOriginRuntime({ root: repo.root() }, logger, {
            name: 'Team',
            kind: 'local',
            access: () => Promise.reject(new Error('no remote')),
        });
        closeOriginRuntime();

        expect(openSyncState()).toBeNull();
    });

    it('asks nothing of a runtime with no loop, or of none at all', () => {
        requestSync();
        openOriginRuntime({ root: repo.root() }, logger);
        requestSync();

        expect(openSyncState()).toBeNull();
    });

    it('does not speak to a window that was taken back', () => {
        const sent: Sent[] = [];
        const unbind = bindRuntimeWindow(target(sent));

        unbind();
        openOriginRuntime({ root: repo.root() }, logger, {
            name: 'Team',
            kind: 'local',
            access: () => Promise.reject(new Error('no remote')),
        });

        expect(sent).toEqual([]);
    });
});
