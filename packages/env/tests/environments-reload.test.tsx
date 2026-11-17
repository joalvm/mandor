import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore } from '@mandor/shell';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { envStore } from '../src/env-store.js';
import { useEnvironments } from '../src/hooks/useEnvironments.js';
import {
    cancelEnvironmentWrite,
    scheduleEnvironmentWrite,
} from '../src/lib/pending-environment-write.js';
import {
    flushPendingGlobalsWrite,
    scheduleGlobalsWrite,
} from '../src/lib/pending-globals-write.js';
import { reloadEnvironments } from '../src/lib/reload-environments.js';

const PROD = { id: 'prod', name: 'Prod', variables: [] };
const HOST = { name: 'host', value: 'x', enabled: true, secret: false };

let calls: string[];

function Harness() {
    useEnvironments();

    return <span />;
}

beforeEach(() => {
    vi.restoreAllMocks();
    calls = [];
    envStore.getState().reset();
    shellStore.getState().reset();
    shellStore.setState({ activeWorkspaceId: 'pagos' });
    vi.spyOn(bridge.environment, 'list').mockImplementation(() => {
        calls.push('list');

        return Promise.resolve(success([PROD]));
    });
    vi.spyOn(bridge.environment, 'update').mockImplementation(() => {
        calls.push('update');

        return Promise.resolve(success(PROD));
    });
    vi.spyOn(bridge.globals, 'write').mockImplementation(() => {
        calls.push('setGlobals');

        return Promise.resolve(success({ variables: [HOST] }));
    });
});

afterEach(async () => {
    cancelEnvironmentWrite('pagos', 'prod');
    await flushPendingGlobalsWrite();
    cleanup();
    shellStore.getState().reset();
});

describe('reading the environments again because their files changed on disk', () => {
    it('sends what was typed first, so the read never erases the typing', async () => {
        scheduleEnvironmentWrite('pagos', PROD);
        scheduleGlobalsWrite([HOST]);

        await reloadEnvironments('pagos');

        const reads = calls.filter((call) => call === 'list');
        const writes = calls.filter((call) => call !== 'list');

        expect(writes.toSorted()).toEqual(['setGlobals', 'update']);
        expect(calls.lastIndexOf('list')).toBeGreaterThan(calls.indexOf('update'));
        expect(reads.length).toBeGreaterThan(0);
    });

    it('only reads when nothing was typed', async () => {
        await reloadEnvironments('pagos');

        expect(calls.filter((call) => call !== 'list')).toEqual([]);
        expect(envStore.getState().environments).toEqual([PROD]);
    });

    it('leaves alone the typing of another workspace', async () => {
        scheduleEnvironmentWrite('otro', PROD);

        await reloadEnvironments('pagos');

        expect(calls).not.toContain('update');

        cancelEnvironmentWrite('otro', 'prod');
    });
});

describe('the environments the window shows when files change under it', () => {
    async function mounted(): Promise<void> {
        render(<Harness />);
        await waitFor(() => {
            expect(envStore.getState().environments).toEqual([PROD]);
        });
        calls.length = 0;
    }

    it('reads them again when an environment of the workspace changed', async () => {
        await mounted();

        (bridge as FakeBridge).emitRepoChanged({
            changes: [{ area: 'environment', workspaceId: 'pagos', id: 'prod' }],
        });

        await waitFor(() => {
            expect(calls).toContain('list');
        });
    });

    it('reads them again when the globals of the origin changed', async () => {
        render(<Harness />);
        await waitFor(() => {
            expect(calls).toContain('list');
        });
        calls.length = 0;

        (bridge as FakeBridge).emitRepoChanged({ changes: [{ area: 'globals' }] });

        await waitFor(() => {
            expect(calls).toContain('list');
        });
    });

    it('reads them again when the file of the workspace changed', async () => {
        await mounted();

        (bridge as FakeBridge).emitRepoChanged({
            changes: [{ area: 'workspace', workspaceId: 'pagos' }],
        });

        await waitFor(() => {
            expect(calls).toContain('list');
        });
    });

    it('leaves them alone for another workspace or another kind of file', async () => {
        await mounted();

        (bridge as FakeBridge).emitRepoChanged({
            changes: [
                { area: 'environment', workspaceId: 'otro', id: 'prod' },
                { area: 'collections', workspaceId: 'pagos', path: 'x' },
            ],
        });

        expect(calls).toEqual([]);
    });
});
