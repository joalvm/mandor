import { itemResource } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { createRequestItem, type RequestItem } from '@mandor/schema';
import { bridge, settlePendingWrites, shellStore } from '@mandor/shell';
import { editorAt, editorsIn } from '@mandor/ui/testing/editors-in';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestScripts } from '../../../../src/renderer/features/requests/components/scripts/RequestScripts.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('local', 'events', 'pedidos/alta');

const BAND = 'It does not run until you approve it';

/** What a moved script is set apart by from the one already there. */
const BLANK = '\n\n';

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

/** The request as its tab holds it: every change lands, as the draft of a real tab would. */
function Held({ initial }: { initial: RequestItem }) {
    const [request, setRequest] = useState(initial);

    return (
        <RequestScripts
            onChange={(changes) => {
                setRequest((before) => ({ ...before, ...changes }));
            }}
            request={request}
            resource={RESOURCE}
        />
    );
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

    it('keeps what a document brought under them, as the text it is', async () => {
        shown({
            importedScripts: [{ event: 'onResponse', dialect: 'postman', source: 'pm.test()' }],
        });

        expect(screen.getByText(/do not run here: adjust them to Mandor scripts/)).toBeVisible();
        expect((await editorsIn()).map((editor) => editor.text())).toEqual(['', 'pm.test()']);
    });

    it('moves an imported script into its editor without approving it, mid-burst or not', async () => {
        const approved = new Set(['a()']);
        const approve = vi
            .spyOn(bridge.scripts, 'approve')
            .mockResolvedValue(success({ approved: true }));

        const status = vi.spyOn(bridge.scripts, 'status').mockImplementation(({ scripts }) =>
            Promise.resolve(
                success({
                    statuses: scripts.map(({ source }) =>
                        approved.has(source) ? ('approved' as const) : ('unapproved' as const),
                    ),
                }),
            ),
        );

        render(
            <Held
                initial={{
                    ...createRequestItem({ name: 'alta' }),
                    scripts: { onBeforeRequest: { source: 'a()' } },
                    importedScripts: [
                        { event: 'onBeforeRequest', dialect: 'postman', source: 'pm.x()' },
                    ],
                }}
            />,
            { wrapper: AppProviders },
        );

        const native = await editorAt(0);

        await waitFor(() => {
            expect(status).toHaveBeenCalled();
        });
        await act(async () => {
            await status.mock.results[0]?.value;
        });

        // A burst begun over the approved text, and the move before its pause.
        native.typeOver('a()b');
        fireEvent.click(screen.getByRole('button', { name: 'Move to the script editor' }));
        await screen.findByText(BAND);

        expect(native.text()).toBe('a()b' + BLANK + 'pm.x()');

        native.typeOver('a()b' + BLANK + 'pm.x()c');
        await act(() => settlePendingWrites());

        expect(approve).not.toHaveBeenCalled();
        expect(screen.getByText(BAND)).toBeVisible();
    });
});
