import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClientCredentialsFields } from '../src/components/auth/ClientCredentialsFields.js';
import { CodePkceFields } from '../src/components/auth/CodePkceFields.js';
import { RedirectPortField } from '../src/components/auth/RedirectPortField.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

const CLIENT_CREDENTIALS = {
    type: 'oauth2-client-credentials',
    tokenUrl: 'https://idp.example.com/token',
    clientId: 'client',
    clientSecret: 's3cret',
    clientAuth: 'basic',
} as const;

const CODE_PKCE = {
    type: 'oauth2-code-pkce',
    authorizationUrl: 'https://idp.example.com/authorize',
    tokenUrl: 'https://idp.example.com/token',
    clientId: 'client',
} as const;

afterEach(cleanup);

function openAdvanced(): void {
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
}

describe('ClientCredentialsFields', () => {
    it('draws the fields of the flow, with the audience folded under advanced', () => {
        render(
            <ClientCredentialsFields
                auth={CLIENT_CREDENTIALS}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
            />,
            { wrapper: Wrapper },
        );

        // The token URL and the client come from OAuth2ClientRows, shared by both flows.
        for (const name of ['Token URL', 'Client ID', 'Client secret', 'Scope']) {
            expect(screen.getByRole('textbox', { name })).toBeVisible();
        }

        expect(screen.getByRole('combobox', { name: 'Send the secret' })).toBeVisible();
        expect(screen.queryByRole('textbox', { name: 'Audience' })).toBeNull();
        expect(screen.queryByRole('textbox', { name: 'Authorization URL' })).toBeNull();

        openAdvanced();

        expect(screen.getByRole('textbox', { name: 'Audience' })).toBeVisible();
    });

    it('opens advanced by itself when the level carries an audience', () => {
        render(
            <ClientCredentialsFields
                auth={{ ...CLIENT_CREDENTIALS, audience: 'api' }}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('textbox', { name: 'Audience' })).toBeVisible();
    });
});

describe('CodePkceFields', () => {
    it('draws the fields of the code flow, with the redirect port folded under advanced', () => {
        render(
            <CodePkceFields
                auth={CODE_PKCE}
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
            />,
            { wrapper: Wrapper },
        );

        for (const name of [
            'Authorization URL',
            'Token URL',
            'Client ID',
            'Client secret',
            'Scope',
        ]) {
            expect(screen.getByRole('textbox', { name })).toBeVisible();
        }

        expect(screen.queryByRole('textbox', { name: 'Audience' })).toBeNull();
        expect(screen.queryByRole('textbox', { name: 'Redirect port' })).toBeNull();

        openAdvanced();

        expect(screen.getByRole('textbox', { name: 'Redirect port' })).toBeVisible();
    });

    it('takes an optional field out of the level when it is emptied', () => {
        const onChange = vi.fn();

        render(
            <CodePkceFields
                auth={{ ...CODE_PKCE, scope: 'read' }}
                environment={undefined}
                onChange={onChange}
                onVariablesChange={() => undefined}
            />,
            { wrapper: Wrapper },
        );

        const scope = screen.getByRole('textbox', { name: 'Scope' });

        scope.textContent = '';
        fireEvent.input(scope);

        expect(onChange).toHaveBeenCalledWith({ ...CODE_PKCE, scope: undefined });
    });
});

describe('RedirectPortField', () => {
    it('says the redirect URI to register once there is a port', () => {
        render(<RedirectPortField onChange={vi.fn()} value={8123} />, { wrapper: Wrapper });

        expect(
            screen.getByText(
                'Register this redirect URI with the provider: http://127.0.0.1:8123/callback',
            ),
        ).toBeVisible();
    });

    it('says a free port is picked when there is none', () => {
        render(<RedirectPortField onChange={vi.fn()} value={undefined} />, { wrapper: Wrapper });

        expect(screen.getByRole('textbox', { name: 'Redirect port' })).toHaveAccessibleDescription(
            /picks a free port/u,
        );
    });

    it('hands over a port the file may hold, and nothing for one it may not', () => {
        const onChange = vi.fn();

        render(<RedirectPortField onChange={onChange} value={undefined} />, { wrapper: Wrapper });

        const field = within(document.body).getByRole('textbox', { name: 'Redirect port' });

        field.textContent = '80';
        fireEvent.input(field);

        expect(onChange).not.toHaveBeenCalled();

        field.textContent = '8123';
        fireEvent.input(field);

        expect(onChange).toHaveBeenCalledWith(8123);
    });
});
