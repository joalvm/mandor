import { MessagesProvider } from '@mandor/i18n';
import { failure, success } from '@mandor/ipc';
import { createEnvironment, type FolderChainLevel } from '@mandor/schema';
import { bridge, shellStore, TabProvider } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { envStore } from '../src/env-store.js';
import { chainKey } from '../src/lib/folder-chains.js';
import {
    flushFolderVariablesWrite,
    scheduleFolderVariablesWrite,
} from '../src/lib/pending-folder-variables-write.js';
import { folderOfResource } from '../src/lib/folder-of-resource.js';
import { variableNotes } from '../src/lib/variable-notes.js';
import { windowScope } from '../src/lib/window-scope.js';
import { FolderVariables } from '../src/index.js';

const PROD = createEnvironment({
    id: 'prod',
    name: 'Prod',
    variables: [{ name: 'host', value: 'prod.example', enabled: true, secret: false }],
});
const DEV = createEnvironment({ id: 'dev', name: 'Dev', variables: [] });
const STAGE = createEnvironment({
    id: 'stage',
    name: 'Stage',
    variables: [{ name: 'host', value: 'stage.example', enabled: true, secret: false }],
});
const HOST = { name: 'host', value: 'altas.local', enabled: true, secret: false };

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

function chainOf(level: 'collection' | 'folder', name: string): FolderChainLevel[] {
    return [
        {
            level,
            place: { kind: 'folder', path: 'pedidos' },
            name,
            settings: { variables: [HOST] },
        },
        { level: 'workspace', place: { kind: 'workspace' }, name: 'Events', settings: {} },
    ];
}

async function show(
    level: 'collection' | 'folder',
    name: string,
    variables: ReactNode = <FolderVariables />,
): Promise<void> {
    envStore.setState({
        environments: [PROD, DEV, STAGE],
        activeEnvironmentIds: { events: 'prod' },
        folderChains: { [chainKey('events', 'pedidos')]: chainOf(level, name) },
    });
    vi.spyOn(bridge.collections, 'chain').mockResolvedValue(success(chainOf(level, name)));
    render(
        <TabProvider
            value={{ resource: 'mandor://local/events/folder/pedidos', tabId: 'folder-1' }}
        >
            {variables}
        </TabProvider>,
        { wrapper: Wrapper },
    );
    // The chain the tab asks for on mount lands before the test looks.
    await act(() => Promise.resolve());
}

beforeEach(() => {
    envStore.getState().reset();
    shellStore.setState({ activeWorkspaceId: 'events' });
});

afterEach(async () => {
    cleanup();
    await flushFolderVariablesWrite('events', 'pedidos');
    envStore.getState().reset();
    shellStore.getState().reset();
});

describe('the variables of a collection or a folder', () => {
    it('say on a folder that a row overrides the active environment', async () => {
        await show('folder', 'Pedidos');

        expect(screen.getAllByRole('textbox', { name: 'Key' })[0]).toHaveTextContent('host');
        expect(screen.getByText(/Overrides Prod/)).toBeInTheDocument();
    });

    it('say on a collection that the active environment overrides a row', async () => {
        await show('collection', 'Pedidos');

        expect(screen.getByText(/Overridden by Prod/)).toBeInTheDocument();
    });

    it('change their note when the environment changes', async () => {
        await show('folder', 'Pedidos');
        act(() => {
            envStore.setState({ activeEnvironmentIds: { events: 'dev' } });
        });

        expect(screen.queryByText(/Overrides Prod/)).toBeNull();
    });

    it('follow the environment the app chose over the one of the window', async () => {
        await show('folder', 'Pedidos', <FolderVariables environmentId="stage" />);

        expect(screen.getByText(/Overrides Stage/)).toBeInTheDocument();
        expect(screen.queryByText(/Prod/)).toBeNull();
    });

    it('fall to the default of the workspace when the app chose none', async () => {
        envStore.setState({ defaultEnvironmentIds: { events: 'stage' } });
        await show('folder', 'Pedidos', <FolderVariables environmentId={null} />);

        expect(screen.getByText(/Overrides Stage/)).toBeInTheDocument();
    });

    it('write what is typed through the patch of the folder, a moment later', async () => {
        await show('folder', 'Pedidos');

        const write = vi.spyOn(bridge.collections, 'writeSettings');
        const value = screen.getAllByRole('textbox', { name: 'Value' })[0];

        if (value === undefined) {
            throw new Error('no value on screen');
        }

        value.textContent = 'otra.local';
        fireEvent.input(value);
        await act(() => flushFolderVariablesWrite('events', 'pedidos'));

        expect(write).toHaveBeenCalledWith({
            workspaceId: 'events',
            path: 'pedidos',
            patch: { variables: [{ ...HOST, value: 'otra.local' }] },
        });
    });
});

describe('the writes and notes behind them', () => {
    it('keep a list with a name Mandor cannot use on screen, and write nothing', async () => {
        envStore.setState({
            folderChains: { [chainKey('events', 'pedidos')]: chainOf('folder', 'P') },
        });

        const write = vi.spyOn(bridge.collections, 'writeSettings');

        scheduleFolderVariablesWrite('events', 'pedidos', [{ ...HOST, name: 'bad name' }], vi.fn());
        await flushFolderVariablesWrite('events', 'pedidos');

        expect(write).not.toHaveBeenCalled();
        expect(
            envStore.getState().folderChains[chainKey('events', 'pedidos')]?.[0]?.settings
                .variables,
        ).toEqual([{ ...HOST, name: 'bad name' }]);
    });

    it('tell a write the disk refused, and go back to what the disk holds', async () => {
        const onRefused = vi.fn();

        envStore.setState({
            folderChains: { [chainKey('events', 'pedidos')]: chainOf('folder', 'P') },
        });
        vi.spyOn(bridge.collections, 'writeSettings').mockResolvedValue(failure('unknown', 'x'));
        vi.spyOn(bridge.collections, 'chain').mockResolvedValue(
            success(chainOf('folder', 'En disco')),
        );

        scheduleFolderVariablesWrite('events', 'pedidos', [HOST], onRefused);
        await flushFolderVariablesWrite('events', 'pedidos');

        expect(onRefused).toHaveBeenCalledWith('unknown');
        expect(envStore.getState().folderChains[chainKey('events', 'pedidos')]?.[0]?.name).toBe(
            'En disco',
        );
    });

    it('say nothing of a row no other level declares', () => {
        const scope = windowScope(DEV, [], chainOf('folder', 'Pedidos'));

        const own = { level: 'folder', label: 'Pedidos' } as const;
        const word = (key: string): string => key;

        expect(variableNotes({ names: ['host'], scope, own, environment: DEV }, word)).toEqual([]);
        expect(variableNotes({ names: ['nadie'], scope, own, environment: DEV }, word)).toEqual([]);
    });

    it('looks at no folder from a tab of something else', () => {
        expect(folderOfResource('mandor://_app/settings')).toBeNull();
    });
});
