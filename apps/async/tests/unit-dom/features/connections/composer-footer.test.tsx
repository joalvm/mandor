import { MessagesProvider } from '@mandor/i18n';
import type { MessagePayloadType } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerFooter } from '../../../../src/renderer/features/connections/components/strip/ComposerFooter.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function draw(
    payloadType: MessagePayloadType = 'text',
    onBeautify: () => void = () => undefined,
    onPayloadTypeChange: (payloadType: MessagePayloadType) => void = () => undefined,
    transport: 'socketio' | 'websocket' = 'websocket',
): void {
    render(
        <Wrapper>
            <ComposerFooter
                eventName="Saludo"
                expectAckEnabled={false}
                onBeautify={onBeautify}
                onEventNameChange={() => undefined}
                onExpectAckChange={() => undefined}
                onPayloadTypeChange={onPayloadTypeChange}
                payloadType={payloadType}
                transport={transport}
            />
        </Wrapper>,
    );
}

describe('the foot of the composer', () => {
    it('names the reading the payload is taken in', () => {
        draw('json');

        expect(screen.getByRole('combobox', { name: 'Lenguaje' })).toHaveTextContent('JSON');
    });

    /** The button does not read the text: the format the user declared decides. */
    it('keeps the word that tidies out of reach while the payload reads as text', () => {
        draw('text');

        expect(screen.getByRole('button', { name: 'Beautify' })).toBeDisabled();
    });

    it('tidies a json payload when the word is pressed', () => {
        const onBeautify = vi.fn();

        draw('json', onBeautify);

        fireEvent.click(screen.getByRole('button', { name: 'Beautify' }));

        expect(onBeautify).toHaveBeenCalledOnce();
        expect(screen.getByRole('button', { name: 'Beautify' })).toHaveAttribute(
            'data-variant',
            'link',
        );
    });

    it('hands the chosen reading to the composer', async () => {
        const onPayloadTypeChange = vi.fn();

        draw('text', () => undefined, onPayloadTypeChange);

        const reading = screen.getByRole('combobox', { name: 'Lenguaje' });

        fireEvent.keyDown(reading, { code: 'ArrowDown', key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: 'JSON' }));

        expect(onPayloadTypeChange).toHaveBeenCalledWith('json');
    });

    it('brings the field of the event and the ack only to a connection that speaks Socket.IO', () => {
        draw(
            'text',
            () => undefined,
            () => undefined,
            'socketio',
        );

        expect(screen.getByRole('textbox', { name: 'Evento' })).toBeVisible();
        expect(screen.getByRole('checkbox', { name: 'Esperar ack' })).toBeVisible();
    });

    it('keeps both out of a connection whose transport carries no names', () => {
        draw('text');

        expect(screen.queryByRole('textbox', { name: 'Evento' })).toBeNull();
        expect(screen.queryByRole('checkbox', { name: 'Esperar ack' })).toBeNull();
    });
});
