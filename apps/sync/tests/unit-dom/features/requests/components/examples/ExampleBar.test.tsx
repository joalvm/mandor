import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExampleBar } from '../../../../../../src/renderer/features/requests/components/examples/ExampleBar.js';
import { AppProviders } from '../../../../support/app-providers.js';

const ENVIRONMENT = {
    id: 'local',
    name: 'local',
    variables: [{ enabled: true, name: 'base_url', secret: false, value: 'http://x/' }],
};

afterEach(cleanup);

function draw(props: Partial<React.ComponentProps<typeof ExampleBar>> = {}): void {
    render(
        <ExampleBar
            environment={ENVIRONMENT}
            method="POST"
            requestName="crear pedido"
            url="http://localhost/pedidos"
            {...props}
        />,
        { wrapper: AppProviders },
    );
}

describe('the bar of an example', () => {
    it('reads the method and the url of the request, and writes none of them', () => {
        draw();

        expect(screen.getByText('POST')).toBeVisible();
        expect(screen.getByRole('textbox', { name: 'URL' })).toHaveTextContent(
            'http://localhost/pedidos',
        );
        expect(screen.getByRole('textbox', { name: 'URL' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
        expect(screen.queryByRole('button', { name: /^Method/u })).toBeNull();
    });

    it('says where the method and the url are edited, naming the request', async () => {
        draw();

        fireEvent.focus(screen.getByRole('textbox', { name: 'URL' }));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Method and URL are edited in crear pedido',
        );
    });

    it('draws no button while there is nothing to send with', () => {
        draw();

        expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    });

    it('sends, and cuts the send while it is in flight', () => {
        const onSend = vi.fn();
        const onCancel = vi.fn();

        draw({ onCancel, onSend });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        expect(onSend).toHaveBeenCalledOnce();

        cleanup();
        draw({ onCancel, onSend, sending: true });
        fireEvent.click(screen.getByRole('button', { name: 'Abort' }));

        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('paints the variables of the url as the request does, and opens none', () => {
        draw({ url: '{{base_url}}session' });

        const token = screen
            .getByRole('textbox', { name: 'URL' })
            .querySelector<HTMLElement>('[data-part="variable-token"]');

        expect(token?.dataset['variable']).toBe('base_url');
        expect(token?.dataset['tone']).toBe('resolved');

        fireEvent.pointerOver(token ?? document.body);

        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
