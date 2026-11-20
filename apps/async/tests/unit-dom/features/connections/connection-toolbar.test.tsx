import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment } from '@mandor/schema';
import type { WsState } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionToolbar } from '../../../../src/renderer/features/connections/components/panel/ConnectionToolbar.js';

const ENVIRONMENT = createEnvironment({
    id: 'local',
    name: 'local',
    variables: [
        { name: 'baseUrl', value: 'wss://staging.example.com', enabled: true, secret: false },
    ],
});
const STAGING = createEnvironment({ id: 'staging', name: 'staging' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

type DrawOptions = {
    url: string;
    environment?: typeof ENVIRONMENT;
    onEnvironmentChange?: (environmentId: string) => void;
    namespace?: string;
    openedAt?: number;
    wsState?: WsState;
};

function draw({
    url,
    environment = ENVIRONMENT,
    onEnvironmentChange = () => undefined,
    namespace,
    openedAt,
    wsState = 'idle',
}: DrawOptions) {
    return render(
        <Wrapper>
            <ConnectionToolbar
                environment={environment}
                environmentId={environment.id}
                environments={[ENVIRONMENT, STAGING]}
                live={false}
                namespace={namespace}
                onEnvironmentChange={onEnvironmentChange}
                onToggle={() => undefined}
                onUrlChange={() => undefined}
                onVariablesChange={() => undefined}
                openedAt={openedAt}
                pending={false}
                url={url}
                wsState={wsState}
            />
        </Wrapper>,
    );
}

describe('the toolbar of a connection', () => {
    it('paints the variables of the URL with the tone the environment earns them', () => {
        const { container } = draw({ url: '{{baseUrl}}/orders' });

        const token = container.querySelector<HTMLElement>('[data-part="variable-token"]');

        expect(token?.dataset['variable']).toBe('baseUrl');
        expect(token?.dataset['tone']).toBe('resolved');
    });

    it('opens the popover of a variable of the URL from where it stands', async () => {
        const { container } = draw({ url: '{{baseUrl}}/orders' });

        const token = container.querySelector<HTMLElement>('[data-variable="baseUrl"]');

        if (token === null) {
            throw new Error('the URL carries no token');
        }

        fireEvent.pointerOver(token);

        expect(await screen.findByRole('dialog', { name: '{{baseUrl}}' })).toBeInTheDocument();
    });

    it('stands at the height of a toolbar', () => {
        const { container } = draw({ url: 'ws://127.0.0.1:3000' });

        expect(container.querySelector('[data-part="connection-toolbar"]')).toHaveClass(
            'h-toolbar',
        );
    });

    /** The bar ends at the toggle: the recording heads the activity it records. */
    it('ends at the toggle, with no recording on the bar', () => {
        draw({ url: 'ws://127.0.0.1:3000' });

        expect(screen.queryByRole('button', { name: 'Grabar' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Conectar' })).toBeVisible();
    });

    it('joins the environment, the namespace and the URL into one address bar', () => {
        const { container } = draw({ url: 'http://127.0.0.1:3000', namespace: '/chat' });

        const bar = container.querySelector('[data-part="address-bar"]');

        expect(bar?.querySelector('[data-part="environment-select"]')).not.toBeNull();
        expect(bar?.querySelector('[data-part="connection-namespace"]')).toHaveTextContent('/chat');
        expect(bar?.querySelector('[data-part="transport-logo"]')).toBeNull();
    });
});

describe('the environment select of the toolbar', () => {
    it('hands the chosen environment to the connection', async () => {
        const onEnvironmentChange = vi.fn();

        draw({ url: 'ws://127.0.0.1:3000', onEnvironmentChange });

        // A menu hangs from a pointer, so the test opens it the way the pointer would.
        fireEvent.pointerDown(screen.getByRole('button', { name: /local/u }), {
            button: 0,
            ctrlKey: false,
        });
        fireEvent.click(await screen.findByRole('menuitem', { name: 'staging' }));

        expect(onEnvironmentChange).toHaveBeenCalledWith(STAGING.id);
    });

    /** Managing environments is chrome of the window: the bar of a connection only chooses. */
    it('offers no door to manage the environments', async () => {
        draw({ url: 'ws://127.0.0.1:3000' });

        fireEvent.pointerDown(screen.getByRole('button', { name: /local/u }), {
            button: 0,
            ctrlKey: false,
        });
        await screen.findByRole('menuitem', { name: 'staging' });

        expect(screen.queryByRole('menuitem', { name: /Administrar/u })).not.toBeInTheDocument();
    });
});

describe('the state inside the address of a connection', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('says how long an open connection has been connected', () => {
        vi.useFakeTimers();
        vi.setSystemTime(Date.parse('2026-08-24T10:00:42.000Z'));

        const { container } = draw({
            openedAt: Date.parse('2026-08-24T10:00:00.000Z'),
            url: 'ws://127.0.0.1:3000',
            wsState: 'open',
        });

        const pill = container.querySelector('[data-part="address-end"] [data-part="badge"]');

        expect(pill).toHaveTextContent('Conectada · 00:42');
        expect(pill).toHaveAttribute('data-tone', 'success');
    });

    it('says a connection is on its way while it dials', () => {
        const { container } = draw({ url: 'ws://127.0.0.1:3000', wsState: 'connecting' });

        const pill = container.querySelector('[data-part="address-end"] [data-part="badge"]');

        expect(pill).toHaveTextContent('Conectando');
        expect(pill).toHaveAttribute('data-tone', 'warning');
    });

    /** The toggle beside already says a closed connection can connect. */
    it('says nothing for a connection that is closed', () => {
        const { container } = draw({ url: 'ws://127.0.0.1:3000', wsState: 'closed' });

        expect(container.querySelector('[data-part="address-end"] [data-part="badge"]')).toBeNull();
    });
});
