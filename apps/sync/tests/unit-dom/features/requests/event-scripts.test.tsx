import type { RequestScripts } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EventScripts } from '../../../../src/renderer/features/requests/components/scripts/EventScripts.js';
import { AppProviders } from '../../support/app-providers.js';

function shown(scripts: RequestScripts | undefined) {
    const onChange = vi.fn();

    render(
        <EventScripts
            level="folder"
            onChange={onChange}
            resource="mandor://local/events/folder/pedidos"
            scripts={scripts}
            workspaceId="events"
        />,
        { wrapper: AppProviders },
    );

    return onChange;
}

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

describe('the scripts of one place, by moment of the send (EventScripts)', () => {
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
});
