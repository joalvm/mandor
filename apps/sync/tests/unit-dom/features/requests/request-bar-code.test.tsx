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
            onMethod={() => undefined}
            onOpenCode={() => undefined}
            onPasteText={() => false}
            onSend={() => undefined}
            onUrl={() => undefined}
            onVariablesChange={() => undefined}
            sending={false}
            url="http://localhost/pedidos"
            {...overrides}
        />
    );
}

describe('the code and the paste of the bar', () => {
    it('opens the request as code from the icon at the end of the address', () => {
        const onOpenCode = vi.fn();

        draw(sendBar({ onOpenCode }));

        const button = screen.getByRole('button', { name: 'Code' });

        fireEvent.click(button);

        expect(onOpenCode).toHaveBeenCalledTimes(1);
        expect(button.closest('[data-part="address-actions"]')).not.toBeNull();
    });

    it('writes the code with a name nobody defined, as it writes the send', () => {
        const onOpenCode = vi.fn();

        draw(sendBar({ onOpenCode, url: '{{nobody}}/pedidos' }));

        const button = screen.getByRole('button', { name: 'Code' });

        expect(button).toBeEnabled();

        fireEvent.click(button);

        expect(onOpenCode).toHaveBeenCalledTimes(1);
    });

    it('stays at hand while a send is on its way', () => {
        draw(sendBar({ sending: true }));

        expect(screen.getByRole('button', { name: 'Code' })).toBeEnabled();
    });

    it('lets the owner take what is pasted into the url, and then inserts nothing', () => {
        const onPasteText = vi.fn(() => true);
        const onUrl = vi.fn();

        draw(sendBar({ onPasteText, onUrl, url: '' }));
        fireEvent.paste(screen.getByRole('textbox', { name: 'URL' }), {
            clipboardData: { getData: () => 'curl http://x' },
        });

        expect(onPasteText).toHaveBeenCalledWith('curl http://x');
        expect(onUrl).not.toHaveBeenCalled();
    });
});
