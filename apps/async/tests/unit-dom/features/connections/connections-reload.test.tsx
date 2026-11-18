import { success } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { bridge, shellStore } from '@mandor/shell';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import {
    connectionsStore,
    WorkspaceConnections,
} from '../../../../src/renderer/features/connections/index.js';
import {
    scheduleConnectionWrite,
    settlePendingConnectionWrites,
} from '../../../../src/renderer/features/connections/lib/pending-connection-write.js';
import { reloadConnections } from '../../../../src/renderer/features/connections/lib/reload-connections.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';
import { reloadNever } from './support/reload-never.js';

const ECHO = fakeConnection('echo', 'Echo');
const SCOPE = { workspaceId: 'events' };

type Changed = Parameters<FakeBridge['emitRepoChanged']>[0]['changes'][number];

let calls: string[];

beforeEach(() => {
    vi.restoreAllMocks();
    calls = [];
    connectionsStore.getState().reset();
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    vi.spyOn(asyncBridge.connection, 'list').mockImplementation(() => {
        calls.push('list');

        return Promise.resolve(success([ECHO]));
    });
    vi.spyOn(asyncBridge.connection, 'update').mockImplementation(() => {
        calls.push('update');

        return Promise.resolve(success(ECHO));
    });
});

afterEach(async () => {
    cleanup();
    await settlePendingConnectionWrites();
    shellStore.getState().reset();
});

describe('reading the connections again because their files changed on disk', () => {
    it('sends what was typed first, so the read never erases the typing', async () => {
        scheduleConnectionWrite(SCOPE, ECHO, { url: 'ws://example.test/moved' });

        await reloadConnections(SCOPE);

        expect(calls).toEqual(['update', 'list']);
    });

    it('only reads when nothing was typed', async () => {
        await reloadConnections(SCOPE);

        expect(calls).toEqual(['list']);
    });

    it('keeps what is live as it was', async () => {
        connectionsStore.getState().setConnections([ECHO]);
        connectionsStore.getState().setConnectionState('echo', 'open');

        await reloadConnections(SCOPE);

        expect(connectionsStore.getState().states['echo']).toBe('open');
    });
});

describe('the connections the window shows when files change under it', () => {
    function push(entity: Changed): void {
        act(() => {
            (bridge as FakeBridge).emitRepoChanged({ changes: [entity] });
        });
    }

    async function mounted(): Promise<void> {
        render(<WorkspaceConnections reloadWhen={reloadNever} />, { wrapper: AppProviders });
        await waitFor(() => {
            expect(calls).toEqual(['list']);
        });
        calls.length = 0;
    }

    it('reads them again when a connection of the workspace changed', async () => {
        await mounted();

        push({ area: 'connection', workspaceId: 'events', id: 'echo' });

        await waitFor(() => {
            expect(calls).toEqual(['list']);
        });
    });

    it('leaves them alone for another workspace or another kind of file', async () => {
        await mounted();

        push({ area: 'connection', workspaceId: 'otro', id: 'echo' });
        push({ area: 'environment', workspaceId: 'events', id: 'prod' });

        expect(calls).toEqual([]);
    });
});
