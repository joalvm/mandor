import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MessageToolbar } from '../../../../../../src/renderer/features/messages/components/panel/MessageToolbar.js';
import type { OutboundTarget } from '../../../../../../src/renderer/outbound/outbound-port.js';

import { AppProviders } from '../../../../support/app-providers.js';

const GATEWAY: OutboundTarget = { environmentId: null, id: 'gateway', live: true, name: 'Gateway' };

function draw(props: Partial<Parameters<typeof MessageToolbar>[0]> = {}) {
    const handlers = {
        onChannelChange: vi.fn(),
        onPayloadTypeChange: vi.fn(),
        onSend: vi.fn(),
    };

    render(
        <MessageToolbar
            channel="pedidos.creado"
            payloadType="json"
            targets={() => [GATEWAY]}
            {...handlers}
            {...props}
        />,
        { wrapper: AppProviders },
    );

    return handlers;
}

afterEach(cleanup);

describe('the toolbar of a message', () => {
    it('shows the channel the message goes out on and how its payload is read', () => {
        draw();

        expect(screen.getByRole('textbox', { name: 'Channel' })).toHaveTextContent(
            'pedidos.creado',
        );
        expect(screen.getByRole('combobox', { name: 'Payload type' })).toHaveTextContent('JSON');
    });

    it('hands out the channel as it is typed', () => {
        const { onChannelChange } = draw();
        const field = screen.getByRole('textbox', { name: 'Channel' });

        field.textContent = 'pedidos.pagado';
        fireEvent.input(field);

        expect(onChannelChange).toHaveBeenCalledWith('pedidos.pagado');
    });

    it('hands out the payload type the reader picks', async () => {
        const { onPayloadTypeChange } = draw();

        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Payload type' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });
        fireEvent.click(await screen.findByRole('option', { name: 'Text' }));

        expect(onPayloadTypeChange).toHaveBeenCalledWith('text');
    });

    it('sends through the only live connection when the button is pressed', () => {
        const { onSend } = draw();

        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(onSend).toHaveBeenCalledWith(GATEWAY);
    });
});
