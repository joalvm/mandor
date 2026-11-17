import { envStore } from '@mandor/env';
import { createEnvironment, type FolderChainLevel } from '@mandor/schema';
import { bridge, TabProvider } from '@mandor/shell';
import { success } from '@mandor/ipc';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConnectionFolderVariables } from '../../../../src/renderer/features/connections/components/folder/ConnectionFolderVariables.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';

const HOST = { name: 'host', value: 'altas.local', enabled: true, secret: false };
const CHAIN: FolderChainLevel[] = [
    {
        level: 'folder',
        place: { kind: 'folder', path: 'pedidos/altas' },
        name: 'Altas',
        settings: { variables: [HOST] },
    },
    { level: 'workspace', place: { kind: 'workspace' }, name: 'Events', settings: {} },
];

function environment(id: string, name: string) {
    return createEnvironment({
        id,
        name,
        variables: [{ name: 'host', value: `${id}.example`, enabled: true, secret: false }],
    });
}

async function show(): Promise<void> {
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(CHAIN));
    render(
        <TabProvider value={{ resource: 'mandor://local/events/folder/pedidos/altas', tabId: 'f' }}>
            <ConnectionFolderVariables />
        </TabProvider>,
        { wrapper: AppProviders },
    );
    await act(() => Promise.resolve());
}

beforeEach(() => {
    envStore.getState().reset();
    connectionsStore.getState().reset();
    envStore.setState({
        environments: [environment('local', 'Local'), environment('staging', 'Staging')],
        activeEnvironmentIds: { events: 'local' },
        defaultEnvironmentIds: { events: 'local' },
    });
});

afterEach(() => {
    cleanup();
    envStore.getState().reset();
    connectionsStore.getState().reset();
});

describe('the variables of a folder in Realtime', () => {
    it('weigh the rows against the environment of the connection in front', async () => {
        connectionsStore.setState({
            connections: [{ ...fakeConnection('eco', 'Eco'), environmentId: 'staging' }],
            activeConnectionId: 'eco',
        });
        await show();

        expect(screen.getByText(/Overrides Staging/)).toBeInTheDocument();
        expect(screen.queryByText(/Overrides Local/)).toBeNull();
    });

    it('weigh them against the default of the workspace when the connection names none', async () => {
        envStore.setState({ activeEnvironmentIds: { events: 'staging' } });
        connectionsStore.setState({
            connections: [fakeConnection('eco', 'Eco')],
            activeConnectionId: 'eco',
        });
        await show();

        expect(screen.getByText(/Overrides Local/)).toBeInTheDocument();
    });
});
