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
            onMethod={() => undefined}
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

describe('the paste of the bar', () => {
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
