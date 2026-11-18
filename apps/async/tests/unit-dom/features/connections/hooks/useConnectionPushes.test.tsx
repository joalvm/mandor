import { ROOT_GROUP_ID } from '@mandor/ipc';
import { selectActiveTabId, selectTabShown, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../../src/renderer/app/async-bridge.js';
import { connectionsStore } from '../../../../../src/renderer/features/connections/connections-store.js';
import { useConnectionPushes } from '../../../../../src/renderer/features/connections/hooks/useConnectionPushes.js';
import { AppProviders } from '../../../support/app-providers.js';

type StatePush = Parameters<Parameters<typeof asyncBridge.ws.onState>[0]>[0];

function tab(id: string) {
    return { id, kind: 'connection', resource: `mandor://demo/events/connection/${id}` };
}

/** Mounts the hook over a bridge that hands the test the push main would send. */
function follow(): { push: (value: StatePush) => void } {
    let push: (value: StatePush) => void = () => undefined;

    vi.spyOn(asyncBridge.ws, 'onState').mockImplementation((handler) => {
        push = handler;

        return () => undefined;
    });

    renderHook(
        () => {
            useConnectionPushes();
        },
        { wrapper: AppProviders },
    );

    return {
        push: (value) => {
            act(() => {
                push(value);
            });
        },
    };
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'demo', activeWorkspaceId: 'events' });
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name: 'Gateway',
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [],
        environmentId: null,
    });
});

afterEach(() => {
    cleanup();
    // The spies sit on the one fake bridge the window carries; a live one would keep counting.
    vi.restoreAllMocks();
    connectionsStore.getState().reset();
    shellStore.getState().reset();
});

describe('what main pushes about connections', () => {
    it('lands in the store while the kind is mounted, and stops with it', () => {
        const off = vi.fn();

        vi.spyOn(asyncBridge.ws, 'onState').mockImplementation(() => off);

        const pushes = renderHook(
            () => {
                useConnectionPushes();
            },
            { wrapper: AppProviders },
        );

        pushes.unmount();

        expect(off).toHaveBeenCalledOnce();
    });

    it('moves the state of the connection', () => {
        const pushes = follow();

        pushes.push({ connectionId: 'alpha', state: 'open' });

        expect(connectionsStore.getState().states['alpha']).toBe('open');
    });
});

describe('a connection that falls by itself', () => {
    it('is told in a notice that leads to its tab when the tab is behind another one', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('alpha'));
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('beta'));

        const pushes = follow();

        pushes.push({ connectionId: 'alpha', state: 'open' });
        pushes.push({ connectionId: 'alpha', state: 'error' });

        expect(screen.getByText('Gateway disconnected')).toBeVisible();
        expect(selectTabShown(shellStore.getState(), 'alpha')).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'See activity' }));

        expect(selectActiveTabId(shellStore.getState())).toBe('alpha');
    });

    it('says nothing while its tab is in view: the activity already tells it', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('beta'));
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('alpha'));

        const pushes = follow();

        pushes.push({ connectionId: 'alpha', state: 'open' });
        pushes.push({ connectionId: 'alpha', state: 'reconnecting', attempt: 1 });

        expect(screen.queryByText('Gateway disconnected')).toBeNull();
    });

    it('says nothing when the reader closed it, which goes through closing', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('alpha'));
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('beta'));

        const pushes = follow();

        pushes.push({ connectionId: 'alpha', state: 'open' });
        pushes.push({ connectionId: 'alpha', state: 'closing' });
        pushes.push({ connectionId: 'alpha', state: 'closed' });

        expect(screen.queryByText('Gateway disconnected')).toBeNull();
    });

    it('says nothing for a socket that never came up', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('alpha'));
        shellStore.getState().openTab(ROOT_GROUP_ID, tab('beta'));

        const pushes = follow();

        pushes.push({ connectionId: 'alpha', state: 'connecting' });
        pushes.push({ connectionId: 'alpha', state: 'error' });

        expect(screen.queryByText('Gateway disconnected')).toBeNull();
    });
});
