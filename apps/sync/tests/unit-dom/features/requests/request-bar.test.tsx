import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestBar } from '../../../../src/renderer/features/requests/components/bar/RequestBar.js';

afterEach(cleanup);

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

function sendBar(overrides: Partial<React.ComponentProps<typeof RequestBar>> = {}) {
    return (
        <RequestBar
            environment={undefined}
            method="GET"
            onCancel={() => undefined}
            onKeep={undefined}
            onOpenCode={() => undefined}
            onPasteText={() => false}
            onMethod={() => undefined}
            onSend={() => undefined}
            onUrl={() => undefined}
            onVariablesChange={() => undefined}
            sending={false}
            url="http://localhost/pedidos"
            {...overrides}
        />
    );
}

describe('the bar of the request', () => {
    it('offers to keep the answer beside the code only once there is one', () => {
        const onKeep = vi.fn();

        draw(sendBar());

        expect(screen.queryByRole('button', { name: 'Save response as example' })).toBeNull();

        cleanup();
        draw(sendBar({ onKeep }));
        fireEvent.click(screen.getByRole('button', { name: 'Save response as example' }));

        expect(onKeep).toHaveBeenCalledOnce();
    });

    it('names the method and the destination, and the destination is one field', () => {
        draw(sendBar({ url: '{{baseUrl}}/pedidos' }));

        expect(screen.getByRole('button', { name: 'Method GET' })).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'URL' })).toHaveTextContent(
            '{{baseUrl}}/pedidos',
        );
    });

    it('writes the method the picker chose', async () => {
        const onMethod = vi.fn();

        draw(sendBar({ onMethod, url: '' }));

        // Radix opens the menu on pointerdown of its trigger, and runs the line on click.
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Method GET' }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'POST' }));

        expect(onMethod).toHaveBeenCalledWith('POST');
    });

    it('a method the picker does not list keeps its place in the list', () => {
        draw(sendBar({ method: 'BREW', url: '' }));

        expect(screen.getByRole('button', { name: 'Method BREW' })).toHaveTextContent('BREW');
    });

    it('is not a form: a name nobody defined does not paint the address as invalid', () => {
        draw(sendBar({ url: '{{nobody}}' }));

        expect(screen.getByRole('textbox', { name: 'URL' })).toBeValid();
        expect(document.querySelector('[data-part="address-bar"]')).not.toHaveClass(
            'border-border-error',
        );
    });
});

describe('the send of the bar', () => {
    it('sends what the bar holds when the button is pressed', () => {
        const onSend = vi.fn();

        draw(sendBar({ onSend }));
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(onSend).toHaveBeenCalledTimes(1);
    });

    it('offers to abort in place of sending while the answer is on its way', () => {
        const onCancel = vi.fn();

        draw(sendBar({ onCancel, sending: true }));

        expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Abort' }));

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('sends with a name nobody defined: the button never waits for the variables', () => {
        const onSend = vi.fn();

        draw(sendBar({ onSend, url: '{{token}}/{{host}}' }));

        const button = screen.getByRole('button', { name: 'Send' });

        expect(button).toBeEnabled();

        fireEvent.click(button);

        expect(onSend).toHaveBeenCalledTimes(1);
    });
});
