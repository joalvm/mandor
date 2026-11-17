import { envStore } from '@mandor/env';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { createEnvironment } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activityStore } from '../../../../src/renderer/activity/activity-store.js';
import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { ConnectionPanel } from '../../../../src/renderer/features/connections/components/panel/ConnectionPanel.js';
import {
    connectionsStore,
    ConnectionTabKind,
} from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';
import { openComposerEvent } from './support/open-composer-event.js';

const fakeBridge = asyncBridge as FakeBridge;
const RESOURCE = 'mandor://demo/payments/connection/alpha';
let unregister: () => void;

beforeEach(() => {
    openComposerEvent('alpha');
    activityStore.getState().reset();
    connectionsStore.getState().reset();
    envStore.getState().reset();
    envStore.setState({
        activeEnvironmentIds: { payments: 'local' },
        environments: [
            createEnvironment({
                id: 'local',
                name: 'Local',
                variables: [{ name: 'host', value: 'hidden', enabled: true, secret: true }],
            }),
            createEnvironment({ id: 'staging', name: 'Staging' }),
        ],
    });
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'payments' });
    shellStore.getState().openTab(ROOT_GROUP_ID, {
        id: 'alpha',
        kind: 'connection',
        resource: RESOURCE,
    });
    connectionsStore.getState().upsertConnection(fakeConnection('alpha', 'Gateway'));

    unregister = render(<ConnectionTabKind />, { wrapper: AppProviders }).unmount;
    render(<ConnectionPanel connectionId="alpha" resource={RESOURCE} />, {
        wrapper: AppProviders,
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
    shellStore.getState().reset();
    unregister();
});

describe('the environment of a connection panel', () => {
    it('connects at once with a name nobody defined, written as it is', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const [connection] = connectionsStore.getState().connections;

        if (connection === undefined) {
            throw new Error('the connection fixture is missing');
        }

        act(() => {
            connectionsStore
                .getState()
                .upsertConnection({ ...connection, url: 'wss://{{missing}}/socket' });
        });
        fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

        await waitFor(() => {
            expect(open).toHaveBeenCalledOnce();
        });
        expect(screen.queryByText('Variables are missing')).toBeNull();
    });

    /** Nothing above the connection fills its variables: without an environment there is none. */
    it('connects at once with a variable the workspace environment has and the connection does not', async () => {
        const open = vi.spyOn(asyncBridge.ws, 'open');
        const [connection] = connectionsStore.getState().connections;

        if (connection === undefined) {
            throw new Error('the connection fixture is missing');
        }

        act(() => {
            connectionsStore
                .getState()
                .upsertConnection({ ...connection, url: 'wss://{{host}}/socket' });
        });
        fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

        await waitFor(() => {
            expect(open).toHaveBeenCalledOnce();
        });
        expect(screen.queryByText('Variables are missing')).toBeNull();
    });

    /** The environment is chosen once, in the title bar, and the toolbar no longer offers it. */
    it('leaves the environment out of the toolbar', () => {
        expect(screen.queryByRole('combobox', { name: 'Connection environment' })).toBeNull();
    });

    it('files activity with the environment main used', () => {
        act(() => {
            fakeBridge.emitActivity({
                connectionId: 'alpha',
                environmentId: 'local',
                records: [{ direction: 'in', data: 'hello', at: 1700000000000 }],
            });
        });

        const log = within(screen.getByRole('log', { name: 'Activity' }));

        expect(log.getByRole('img', { name: 'Received' })).toBeVisible();
        expect(log.getByText('5 B')).toBeVisible();
        expect(activityStore.getState().entries[RESOURCE]?.[0]?.detail).toMatchObject({
            environmentId: 'local',
        });
    });
});
