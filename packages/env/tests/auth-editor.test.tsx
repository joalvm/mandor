import { MessagesProvider } from '@mandor/i18n';
import { shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthEditor } from '../src/index.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

type HarnessProps = {
    inheritable?: boolean;
    onChange: (auth: unknown) => void;
    placements?: readonly string[];
    value: unknown;
};

function show({
    inheritable = false,
    onChange,
    placements = ['header', 'query'],
    value,
}: HarnessProps): void {
    render(
        <AuthEditor
            environment={undefined}
            environmentId={null}
            inheritable={inheritable}
            inheritedLabel="The workspace carries the auth that applies."
            onChange={onChange}
            onVariablesChange={() => undefined}
            parentPath={null}
            placements={placements as never}
            value={value as never}
        />,
        { wrapper: Wrapper },
    );
}

async function openOptions(name: string): Promise<HTMLElement> {
    fireEvent.keyDown(screen.getByRole('combobox', { name }), { key: 'ArrowDown' });

    return screen.findByRole('listbox');
}

afterEach(cleanup);

describe('AuthEditor', () => {
    it('draws the fields of the scheme the level carries', () => {
        show({
            onChange: vi.fn(),
            value: { type: 'basic', username: 'ana', password: '{{pass}}' },
        });

        expect(screen.getByRole('textbox', { name: 'Username' })).toHaveTextContent('ana');
        expect(screen.getByRole('textbox', { name: 'Password' })).toHaveTextContent('{{pass}}');
    });

    it('says under the type what the scheme does (AuthDescription)', () => {
        show({ onChange: vi.fn(), value: { type: 'bearer', token: '{{token}}' } });

        expect(
            screen.getByText('Adds an Authorization header with the token, after its prefix.'),
        ).toBeVisible();
    });

    it('says who the auth comes from while the level inherits', () => {
        show({ inheritable: true, onChange: vi.fn(), value: undefined });

        expect(screen.getByText('Uses the auth of the level above.')).toBeVisible();
        expect(screen.getByText('The workspace carries the auth that applies.')).toBeVisible();
    });

    it('offers inherit only where inheriting is an answer', async () => {
        show({ inheritable: true, onChange: vi.fn(), value: { inherit: true } });

        const listbox = await openOptions('Type');

        expect(within(listbox).getByRole('option', { name: 'Inherit' })).toBeVisible();

        cleanup();

        show({ inheritable: false, onChange: vi.fn(), value: { type: 'none' } });

        const reopened = await openOptions('Type');

        expect(within(reopened).queryByRole('option', { name: 'Inherit' })).toBeNull();
    });

    it('answers undefined when the level goes back to inheriting', async () => {
        const onChange = vi.fn();

        show({ inheritable: true, onChange, value: { type: 'none' } });

        const listbox = await openOptions('Type');

        fireEvent.click(within(listbox).getByRole('option', { name: 'Inherit' }));

        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('offers the placements of the app, and nothing else', async () => {
        show({
            onChange: vi.fn(),
            placements: ['header', 'cookie'],
            value: { type: 'apikey', name: 'X-Key', value: 'k', in: 'header' },
        });

        const listbox = await openOptions('Add to');
        const options = within(listbox).getAllByRole('option');

        expect(options.map((option) => option.textContent)).toEqual(['Header', 'Cookie']);
    });

    it('offers the two OAuth2 flows and starts the level the reader picks', async () => {
        const onChange = vi.fn();

        show({ onChange, value: { type: 'none' } });

        const listbox = await openOptions('Type');

        expect(
            within(listbox).getByRole('option', { name: 'OAuth2 client credentials' }),
        ).toBeVisible();

        fireEvent.click(within(listbox).getByRole('option', { name: 'OAuth2 code with PKCE' }));

        expect(onChange).toHaveBeenCalledWith({
            type: 'oauth2-code-pkce',
            authorizationUrl: '',
            tokenUrl: '',
            clientId: '',
        });
    });

    it('shows the state of the token under the fields of an OAuth2 level, and under no other', () => {
        shellStore.setState({ activeWorkspaceId: 'payments' });
        show({
            onChange: vi.fn(),
            value: {
                type: 'oauth2-client-credentials',
                tokenUrl: 'https://idp.example.com/token',
                clientId: 'client',
                clientSecret: '{{secret}}',
                clientAuth: 'basic',
            },
        });

        expect(document.querySelector('[data-part="auth-token-state"]')).not.toBeNull();

        cleanup();
        show({ onChange: vi.fn(), value: { type: 'bearer', token: '{{token}}' } });

        expect(document.querySelector('[data-part="auth-token-state"]')).toBeNull();

        // The window goes first: a field follows the workspace for what scripts set in it.
        cleanup();
        shellStore.setState({ activeWorkspaceId: null });
    });
});
