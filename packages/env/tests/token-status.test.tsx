import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { bridge, shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenStatus } from '../src/components/auth/TokenStatus.js';

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

const OWN = {
    type: 'oauth2-client-credentials',
    tokenUrl: 'https://idp.example.com/token',
    clientId: 'client',
    clientSecret: '{{secret}}',
    clientAuth: 'basic',
} as const;

function show(): void {
    render(<TokenStatus environmentId="staging" own={OWN} parentPath={null} />, {
        wrapper: Wrapper,
    });
}

function state(): Element {
    const found = document.querySelector('[data-part="auth-token-state"]');

    if (found === null) {
        throw new Error('the token state is not drawn');
    }

    return found;
}

async function settle(): Promise<void> {
    await act(() => vi.advanceTimersByTimeAsync(300));
}

beforeEach(() => {
    vi.useFakeTimers();
    shellStore.setState({ activeWorkspaceId: 'payments' });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    shellStore.setState({ activeWorkspaceId: null });
});

describe('TokenStatus', () => {
    it('says there is no token before one was asked for, and offers only to get one', async () => {
        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(
            success({ state: 'none', expiresAt: null }),
        );
        show();
        await settle();

        expect(state()).toHaveTextContent('No token yet');
        expect(screen.getByRole('button', { name: 'Get token' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Forget token' })).not.toBeInTheDocument();
    });

    it('says until when a token serves', async () => {
        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(
            success({ state: 'valid', expiresAt: new Date(Date.now() + 3_600_000).toISOString() }),
        );
        show();
        await settle();

        expect(state()).toHaveTextContent(/^Valid until /u);
        expect(screen.getByRole('button', { name: 'Forget token' })).toBeEnabled();
    });

    it('says a token has expired', async () => {
        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(
            success({ state: 'expired', expiresAt: new Date(Date.now() - 1000).toISOString() }),
        );
        show();
        await settle();

        expect(state()).toHaveTextContent('Expired');
    });

    it('says a token only lives in memory when the machine has no keychain', async () => {
        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(
            success({
                state: 'memory-only',
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
            }),
        );
        show();
        await settle();

        expect(state()).toHaveTextContent(/no keychain/u);
    });

    it('asks for a token with the level the editor holds', async () => {
        vi.spyOn(bridge.auth, 'tokenStatus').mockResolvedValue(
            success({ state: 'none', expiresAt: null }),
        );

        const fetch = vi
            .spyOn(bridge.auth, 'tokenFetch')
            .mockResolvedValue(success({ state: 'none', expiresAt: null }));

        show();
        await settle();
        fireEvent.click(screen.getByRole('button', { name: 'Get token' }));
        await settle();

        expect(fetch).toHaveBeenCalledWith({
            workspaceId: 'payments',
            environmentId: 'staging',
            own: OWN,
            parentPath: null,
        });
    });

    it('draws nothing while no workspace is active', () => {
        shellStore.setState({ activeWorkspaceId: null });

        const { container } = render(
            <TokenStatus environmentId={null} own={OWN} parentPath={null} />,
            { wrapper: Wrapper },
        );

        expect(container.querySelector('[data-part="auth-token-status"]')).toBeNull();
    });
});
