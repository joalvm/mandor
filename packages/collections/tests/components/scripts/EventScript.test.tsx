import type { ScriptEntry } from '@mandor/schema';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventScript } from '../../../src/components/scripts/EventScript.js';
import { AppProviders } from '../../support/app-providers.js';

function shown(entry: ScriptEntry | undefined) {
    const onChange = vi.fn();

    render(
        <AppProviders>
            <EventScript
                entry={entry}
                modelKey="mandor://local/events/connection/alpha:script:onConnect"
                onChange={onChange}
                place={{ event: 'onConnect', level: 'connection', workspaceId: 'events' }}
            />
        </AppProviders>,
    );

    return onChange;
}

afterEach(() => {
    cleanup();
});

describe('the script of one moment (EventScript)', () => {
    it('lays the band of a text that would not run over the text, which stays editable', async () => {
        shown({ source: 'socket.send("hi")' });

        expect(await screen.findByText('It does not run until you approve it')).toBeVisible();
        expect((await editorAt(0)).text()).toBe('socket.send("hi")');
    });

    it('hands back the text typed, with the switch as the person set it', async () => {
        const onChange = shown({ source: '', enabled: false });

        (await editorAt(0)).typeOver('a()');

        expect(onChange).toHaveBeenLastCalledWith({ source: 'a()', enabled: false });
    });

    it('opens an empty editor for a moment with no script', async () => {
        const onChange = shown(undefined);

        (await editorAt(0)).typeOver('b()');

        expect(onChange).toHaveBeenLastCalledWith({ source: 'b()' });
    });
});
