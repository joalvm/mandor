import { itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { createRequestItem, type RequestItem } from '@mandor/schema';
import { bridge, settlePendingWrites, shellStore } from '@mandor/shell';
import { editorAt, editorsIn } from '@mandor/ui/testing/editors-in';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestScripts } from '../../../../src/renderer/features/requests/components/scripts/RequestScripts.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('local', 'events', 'pedidos/alta');

const BAND = 'It does not run until you approve it';

const PLACE = { workspaceId: 'events', level: 'request', event: 'onBeforeRequest' } as const;

function shown(changes: Partial<RequestItem> = {}) {
    const onChange = vi.fn();

    render(
        <RequestScripts
            onChange={onChange}
            request={{ ...createRequestItem({ name: 'alta' }), ...changes }}
            resource={RESOURCE}
        />,
        { wrapper: AppProviders },
    );

    return onChange;
}

afterEach(async () => {
    await act(() => settlePendingWrites());
    cleanup();
    shellStore.getState().reset();
});

describe('the scripts of a request', () => {
    it('writes the script of a moment of the send, and keeps the one of the other', async () => {
        const onChange = shown({ scripts: { onResponse: { source: 'b()' } } });

        (await editorAt(0)).typeOver('a()');

        expect(onChange).toHaveBeenLastCalledWith({
            scripts: { onBeforeRequest: { source: 'a()' }, onResponse: { source: 'b()' } },
        });
    });

    it('opens the script of the answer in its own tab', async () => {
        shown({ scripts: { onResponse: { source: 'b()' } } });

        fireEvent.mouseDown(screen.getByRole('tab', { name: 'After the response' }));
        await screen.findByText(BAND);

        // The panel open before stays mounted, hidden: only the one shown is a tab panel.
        const editors = await editorsIn(screen.getByRole('tabpanel'));

        expect(editors.map((editor) => editor.text())).toEqual(['b()']);
    });

    it('shows the band over a script nobody approved here, and the button approves it', async () => {
        const approve = vi
            .spyOn(bridge.scripts, 'approve')
            .mockResolvedValue(success({ approved: true }));

        shown({ scripts: { onBeforeRequest: { source: 'steal()' } } });

        fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

        expect(approve).toHaveBeenCalledWith({ ...PLACE, source: 'steal()' });
        await waitFor(() => {
            expect(screen.queryByText(BAND)).toBeNull();
        });
        expect((await editorAt(0)).text()).toBe('steal()');
    });

    it('switches the script of the moment off, and keeps its text', async () => {
        const onChange = shown({ scripts: { onBeforeRequest: { source: 'a()' } } });

        await screen.findByText(BAND);

        fireEvent.click(screen.getByRole('switch', { name: 'Enabled' }));

        expect(onChange).toHaveBeenCalledWith({
            scripts: { onBeforeRequest: { source: 'a()', enabled: false } },
        });
    });

    it('shows a script a document brought in its moment, not approved, with no panel of its own', async () => {
        const approve = vi.spyOn(bridge.scripts, 'approve');

        shown({ scripts: { onBeforeRequest: { source: 'pm.test()' } } });

        await screen.findByText(BAND);

        expect((await editorAt(0)).text()).toBe('pm.test()');
        expect(screen.queryByRole('button', { name: 'Move to the script editor' })).toBeNull();
        expect(approve).not.toHaveBeenCalled();
    });
});
