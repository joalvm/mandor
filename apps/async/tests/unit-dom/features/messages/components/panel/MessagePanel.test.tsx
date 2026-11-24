import { ItemProvider } from '@mandor/collections';
import { success } from '@mandor/ipc';
import { createMessageItem } from '@mandor/schema';
import { shellStore, TabProvider } from '@mandor/shell';
import { byPart } from '@mandor/ui/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MessagePanel } from '../../../../../../src/renderer/features/messages/components/panel/MessagePanel.js';
import { messagesStore } from '../../../../../../src/renderer/features/messages/messages-store.js';
import type { OutboundFrame } from '../../../../../../src/renderer/outbound/outbound-port.js';
import { registerOutboundPort } from '../../../../../../src/renderer/outbound/outbound-registry.js';

import { AppProviders } from '../../../../support/app-providers.js';

const RESOURCE = 'mandor://local/events/item/pedido-creado';
const MESSAGE = createMessageItem({
    name: 'Pedido creado',
    channel: 'pedidos.creado',
    payload: '{ "id": 1 }',
    payloadType: 'json',
});

/** Longer than the pause the writer waits for, so the timer has certainly gone off. */
const AFTER_THE_PAUSE = 2000;

const sent: { frame: OutboundFrame; targetId: string }[] = [];
let offPort: () => void = () => undefined;

function draw(): void {
    render(
        <ItemProvider value={{ resource: RESOURCE, saved: undefined }}>
            <TabProvider value={{ resource: RESOURCE, tabId: RESOURCE }}>
                <MessagePanel />
            </TabProvider>
        </ItemProvider>,
        { wrapper: AppProviders },
    );
}

beforeEach(() => {
    vi.restoreAllMocks();
    sent.length = 0;
    shellStore.getState().reset();
    messagesStore.getState().reset();
    offPort = registerOutboundPort({
        send: (targetId, frame) => {
            sent.push({ frame, targetId });

            return Promise.resolve();
        },
        subscribe: () => () => undefined,
        targets: () => [{ environmentId: null, id: 'gateway', live: true, name: 'Gateway' }],
    });
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.useRealTimers();
    offPort();
    messagesStore.getState().reset();
    shellStore.getState().reset();
});

describe('the panel of a message', () => {
    it('draws its toolbar and its strip once the message is read', () => {
        messagesStore.getState().setMessage(RESOURCE, MESSAGE);

        draw();

        expect(byPart('message-panel')).toBeVisible();
        expect(byPart('message-toolbar')).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'Channel' })).toHaveTextContent(
            'pedidos.creado',
        );
    });

    it('draws nothing while the message is not there', () => {
        vi.spyOn(window.mandor.collections, 'readItem').mockReturnValue(
            new Promise(() => undefined),
        );

        draw();

        expect(screen.queryByRole('textbox', { name: 'Channel' })).toBeNull();
    });

    it('sends the payload as it was written, with the item it came from', () => {
        messagesStore.getState().setMessage(RESOURCE, MESSAGE);

        draw();
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(sent).toEqual([
            {
                frame: {
                    itemPath: 'pedido-creado',
                    origin: 'Pedido creado',
                    schema: undefined,
                    template: '{ "id": 1 }',
                },
                targetId: 'gateway',
            },
        ]);
    });

    it('writes a new channel to the file once the typing stops', async () => {
        vi.useFakeTimers();
        messagesStore.getState().setMessage(RESOURCE, MESSAGE);

        const write = vi
            .spyOn(window.mandor.collections, 'writeItem')
            .mockResolvedValue(success({}));

        draw();

        const field = screen.getByRole('textbox', { name: 'Channel' });

        field.textContent = 'pedidos.pagado';
        fireEvent.input(field);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(AFTER_THE_PAUSE);
        });

        expect(write.mock.calls.at(-1)?.[0].fields).toMatchObject({ channel: 'pedidos.pagado' });
    });
});
