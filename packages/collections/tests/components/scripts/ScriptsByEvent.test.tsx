import {
    CONNECTION_SCRIPT_EVENTS,
    REQUEST_SCRIPT_EVENTS,
    type ConnectionScripts,
    type RequestScripts,
} from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScriptsByEvent } from '../../../src/components/scripts/ScriptsByEvent.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = 'mandor://local/events/folder/pedidos';

function shown(scripts: RequestScripts | undefined) {
    const onChange = vi.fn();

    render(
        <ScriptsByEvent
            events={REQUEST_SCRIPT_EVENTS}
            onChange={onChange}
            place={{ level: 'folder', workspaceId: 'events' }}
            resource={RESOURCE}
            scripts={scripts}
        />,
        { wrapper: AppProviders },
    );

    return onChange;
}

function moment(name: string): HTMLElement {
    return screen.getByRole('tab', { name });
}

afterEach(() => {
    cleanup();
    // The moment open is remembered by the place: each test starts on the first.
    shellStore.getState().reset();
});

describe('the scripts of one place, by moment (ScriptsByEvent)', () => {
    it('lists the moments of a send in a column and opens the first one', async () => {
        shown(undefined);

        expect(screen.getByRole('tablist', { name: 'Moment of the send' })).toHaveAttribute(
            'aria-orientation',
            'vertical',
        );
        expect(moment('Before the request')).toHaveAttribute('aria-selected', 'true');
        expect(
            await screen.findByRole('heading', { level: 3, name: 'Before the request' }),
        ).toBeVisible();
    });

    it('opens the script of another moment, and walks the moments with the arrows', async () => {
        shown({ onResponse: { source: 'b()' } });

        fireEvent.mouseDown(moment('After the response'), { button: 0 });

        await waitFor(() => {
            expect(moment('After the response')).toHaveAttribute('aria-selected', 'true');
        });
        // A moment opened once keeps its editor: the one before it is still the first.
        expect((await editorAt(1)).text()).toBe('b()');

        fireEvent.keyDown(moment('After the response'), { key: 'ArrowUp' });

        await waitFor(() => {
            expect(moment('Before the request')).toHaveAttribute('aria-selected', 'true');
        });
    });

    it('marks with a dot the moment that holds code, and dims the one switched off', async () => {
        shown({ onBeforeRequest: { source: '  ' }, onResponse: { source: 'b()', enabled: false } });

        expect(moment('Before the request').querySelector('[data-part="tabs-filled"]')).toBeNull();
        expect(moment('Before the request')).not.toHaveAttribute('data-muted');
        expect(
            moment('After the response').querySelector('[data-part="tabs-filled"]'),
        ).not.toBeNull();
        expect(moment('After the response')).toHaveAttribute('data-muted');
        expect((await editorAt(0)).text()).toBe('  ');
    });

    it('switches the script of the moment open off, keeping its text', async () => {
        const onChange = shown({ onBeforeRequest: { source: 'a()' } });

        fireEvent.click(await screen.findByRole('switch', { name: 'Enabled' }));

        expect(onChange).toHaveBeenLastCalledWith({
            onBeforeRequest: { source: 'a()', enabled: false },
        });
    });

    it('hands back nothing at all once the last script is emptied', async () => {
        const onChange = shown({ onBeforeRequest: { source: 'a()' } });

        await screen.findByText('It does not run until you approve it');
        (await editorAt(0)).typeOver('');

        expect(onChange).toHaveBeenLastCalledWith(undefined);
    });

    it('keeps a script switched off even when its text is empty', async () => {
        const onChange = shown({ onBeforeRequest: { source: '', enabled: false } });

        (await editorAt(0)).typeOver('a()');

        expect(onChange).toHaveBeenLastCalledWith({
            onBeforeRequest: { source: 'a()', enabled: false },
        });
    });

    it('names the moments of a connection as moments of the connection', async () => {
        const scripts: ConnectionScripts = { onMessage: { source: 'c()' } };

        render(
            <ScriptsByEvent
                events={CONNECTION_SCRIPT_EVENTS}
                onChange={vi.fn()}
                place={{ level: 'connection', workspaceId: 'events' }}
                resource="connection:events/alpha"
                scripts={scripts}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('tablist', { name: 'Moment of the connection' })).toBeVisible();
        expect(screen.getAllByRole('tab').map((each) => each.textContent)).toEqual([
            'Before connecting',
            'On connect',
            'On messages',
        ]);
        expect((await editorAt(0)).text()).toBe('');
    });
});
