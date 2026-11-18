import { shellStore } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncBridge } from '../../../../src/renderer/app/async-bridge.js';
import { ConnectionPanel } from '../../../../src/renderer/features/connections/components/panel/ConnectionPanel.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/index.js';

import { AppProviders } from '../../support/app-providers.js';
import { fakeConnection } from './support/fake-connections.js';
import { openComposerEvent } from './support/open-composer-event.js';

/** Longer than the pause the writer waits for, so the timer has certainly gone off. */
const AFTER_THE_PAUSE = 2000;

function show(connectionId: string): { unmount: () => void } {
    return render(
        <ConnectionPanel
            connectionId={connectionId}
            resource={`mandor://demo/payments/connection/${connectionId}`}
        />,
        { wrapper: AppProviders },
    );
}

function open(name: string): void {
    fireEvent.mouseDown(screen.getByRole('tab', { name }));
}

/**
 * A description with nothing in it offers to write one. Its editor is drawn before the composer,
 * so once it is asked for it is the first editor of the panel.
 */
async function write(text: string): Promise<void> {
    fireEvent.click(screen.getByRole('button', { name: 'Write' }));
    (await editorAt(0)).typeOver(text);
}

beforeEach(() => {
    openComposerEvent('alpha');
    openComposerEvent('beta');
    vi.restoreAllMocks();
    vi.useFakeTimers();
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
    connectionsStore.getState().reset();
    connectionsStore
        .getState()
        .setConnections([fakeConnection('alpha', 'Gateway'), fakeConnection('beta', 'Echo')]);
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.useRealTimers();
    // The window schedules a session save on every change; nothing here waits 250 ms for it.
    shellStore.getState().reset();
});

describe('the description of a connection', () => {
    /** It is a field of the item, so it travels by the edit of the item and not by a file. */
    it('writes into the item once the typing stops', async () => {
        const update = vi.spyOn(asyncBridge.connection, 'update');

        show('alpha');
        open('Description');
        await write('# Gateway\n\nWhat it is for.\n');

        expect(update).not.toHaveBeenCalled();

        // The verdict of the payload also waits for the pause, and redraws the strip when it ends.
        await act(() => vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE));

        expect(update).toHaveBeenCalledWith({
            changes: { description: '# Gateway\n\nWhat it is for.\n' },
            connectionId: 'alpha',
            workspaceId: 'events',
        });
    });

    it('shows what the item already said about itself', async () => {
        connectionsStore.getState().upsertConnection({
            ...fakeConnection('alpha', 'Gateway'),
            description: '# Ya escrito\n',
        });

        show('alpha');
        open('Description');

        expect(screen.getByRole('heading', { level: 1, name: 'Ya escrito' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

        expect((await editorAt(0)).text()).toBe('# Ya escrito\n');
    });

    /** Composing is what the panel is for; the description is read when it is wanted. */
    it('is not what the panel opens on', () => {
        show('alpha');

        expect(screen.getByRole('tab', { name: 'Message', selected: true })).toBeVisible();
        expect(screen.getByRole('group', { name: 'Message composer' })).toBeVisible();
    });

    it('gives each connection back the section it was left on', () => {
        const first = show('alpha');

        open('Description');
        first.unmount();

        const second = show('beta');

        expect(screen.getByRole('tab', { name: 'Message', selected: true })).toBeVisible();
        second.unmount();
        show('alpha');

        expect(screen.getByRole('tab', { name: 'Description', selected: true })).toBeVisible();
    });

    /** Reading the description is not a reason to lose the event that was half written. */
    it('leaves the composed event alone while it is being read', async () => {
        show('alpha');

        const composer = screen.getByRole('group', { name: 'Message composer' });

        (await editorAt(0, composer)).typeOver('hola');
        open('Description');
        open('Message');

        expect((await editorAt(0, composer)).text()).toBe('hola');
    });
});
