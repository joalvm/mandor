import { createConnection, type ConnectionScripts } from '@mandor/schema';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SettingsScriptsSection } from '../../../../../../src/renderer/features/connections/components/dialog/SettingsScriptsSection.js';
import { AppProviders } from '../../../../support/app-providers.js';

function shown(scripts: ConnectionScripts | undefined) {
    const onConnectionChange = vi.fn();
    const connection = {
        ...createConnection({ id: 'alpha', name: 'Gateway', url: 'ws://localhost:3000' }),
        ...(scripts === undefined ? {} : { scripts }),
    };

    render(
        <SettingsScriptsSection
            connection={connection}
            onConnectionChange={onConnectionChange}
            workspaceId="events"
        />,
        { wrapper: AppProviders },
    );

    return onConnectionChange;
}

afterEach(() => {
    cleanup();
});

describe('the scripts of a connection, by moment of the connection', () => {
    it('offers the three moments, says what scripts never write and opens before connecting', async () => {
        shown({ onBeforeConnect: { source: 'a()' } });

        expect(screen.getByRole('tab', { name: 'Before connecting' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByRole('tab', { name: 'On connect' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'On messages' })).toBeVisible();
        expect(
            screen.getByText(
                'Scripts do not write the auth or the subprotocols of the connection.',
            ),
        ).toBeVisible();
        expect((await editorAt(0)).text()).toBe('a()');
        expect(await screen.findByText('It does not run until you approve it')).toBeVisible();
    });

    it('writes the text typed into the moment in front, and the rest stays', async () => {
        const onConnectionChange = shown({ onMessage: { source: 'b()' } });

        fireEvent.mouseDown(screen.getByRole('tab', { name: 'On connect' }));
        fireEvent.click(screen.getByRole('tab', { name: 'On connect' }));

        expect(screen.getByRole('tab', { name: 'On connect' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        // A tab opened once keeps its editor: the one before it is still the first.
        (await editorAt(1)).typeOver('mandor.socket.send("hi")');

        expect(onConnectionChange).toHaveBeenLastCalledWith({
            scripts: {
                onMessage: { source: 'b()' },
                onConnect: { source: 'mandor.socket.send("hi")' },
            },
        });
    });

    it('switches the script of the moment in front off, keeping its text', async () => {
        const onConnectionChange = shown({ onBeforeConnect: { source: 'a()' } });

        await screen.findByText('It does not run until you approve it');

        fireEvent.click(screen.getByRole('switch', { name: 'Enabled' }));

        expect(onConnectionChange).toHaveBeenLastCalledWith({
            scripts: { onBeforeConnect: { source: 'a()', enabled: false } },
        });
    });

    it('writes no scripts at all once the last text is emptied', async () => {
        const onConnectionChange = shown({ onBeforeConnect: { source: 'a()' } });

        await screen.findByText('It does not run until you approve it');
        (await editorAt(0)).typeOver('');

        expect(onConnectionChange).toHaveBeenLastCalledWith({ scripts: undefined });
    });
});
