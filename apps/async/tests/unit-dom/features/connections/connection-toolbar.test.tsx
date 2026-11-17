import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

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
    recording?: { active: boolean; entries: number };
    onRecordToggle?: () => void;
};

function draw({
    url,
    environment = ENVIRONMENT,
    onEnvironmentChange = () => undefined,
    namespace,
    recording = { active: false, entries: 0 },
    onRecordToggle = () => undefined,
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
                onRecordToggle={onRecordToggle}
                onToggle={() => undefined}
                onUrlChange={() => undefined}
                onVariablesChange={() => undefined}
                pending={false}
                recording={recording}
                url={url}
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

    it('offers the recording of the connection while it holds none', () => {
        const onRecordToggle = vi.fn();

        draw({ url: 'ws://127.0.0.1:3000', onRecordToggle });

        fireEvent.click(screen.getByRole('button', { name: 'Grabar' }));

        expect(onRecordToggle).toHaveBeenCalledOnce();
    });

    it('says that the connection is recording, and how much the file holds', () => {
        draw({ url: 'ws://127.0.0.1:3000', recording: { active: true, entries: 123 } });

        // The gap between the words is CSS: the accessible name keeps the texts apart loosely.
        const recording = screen.getByRole('button', { name: /Grabando\s*123/ });

        expect(recording).toBeVisible();
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
