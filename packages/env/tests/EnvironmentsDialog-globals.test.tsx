import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { createEnvironment } from '@mandor/schema';
import { bridge, shellStore } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnvironmentPicker, EnvironmentsDialog, envStore } from '../src/index.js';
import { GLOBALS_ROW } from '../src/lib/globals-row.js';

const AFTER_DEBOUNCE = 1000;
const LOCAL = createEnvironment({ id: 'local', name: 'Local' });
const HOST = { name: 'host', value: 'api.local', enabled: true, secret: false };

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

function open(environmentId: string | null): void {
    render(
        <EnvironmentsDialog
            environmentId={environmentId}
            onOpenChange={vi.fn()}
            open
            workspaceId="payments"
        />,
        { wrapper: Wrapper },
    );
}

beforeEach(() => {
    vi.useFakeTimers();
    envStore.getState().reset();
    envStore.setState({ environments: [LOCAL], globals: [HOST] });
    shellStore.setState({ activeWorkspaceId: 'payments' });
    vi.spyOn(bridge.environment, 'list').mockResolvedValue(success([LOCAL]));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    envStore.getState().reset();
    shellStore.getState().reset();
});

describe('the globals in the environments dialog', () => {
    it('stand apart above the environments and cannot be renamed', () => {
        open(GLOBALS_ROW);

        expect(screen.getByRole('option', { name: 'Globals' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.queryByRole('textbox', { name: 'Name' })).toBeNull();
        expect(screen.getAllByRole('textbox', { name: 'Key' })[0]).toHaveTextContent('host');
    });

    it('write the list of the origin once the typing calms', async () => {
        const write = vi.spyOn(bridge.globals, 'write');

        open(GLOBALS_ROW);

        const value = screen.getAllByRole('textbox', { name: 'Value' })[0];

        if (value === undefined) {
            throw new Error('no value on screen');
        }

        value.textContent = 'otra.local';
        fireEvent.input(value);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE);
        });

        expect(write).toHaveBeenCalledWith({
            globals: { variables: [{ ...HOST, value: 'otra.local' }] },
        });
    });
});

describe('the default environment of a workspace', () => {
    it('is chosen from the row of an environment and marked in the list and the picker', async () => {
        const save = vi.spyOn(bridge.environment, 'saveDefault');

        open('local');
        fireEvent.click(screen.getByRole('button', { name: 'Use as default' }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(save).toHaveBeenCalledWith({ workspaceId: 'payments', environmentId: 'local' });
        expect(screen.getByRole('option', { name: 'Local (default)' })).toBeInTheDocument();

        cleanup();
        render(<EnvironmentPicker onChange={vi.fn()} options={[LOCAL]} value={null} />, {
            wrapper: Wrapper,
        });

        expect(screen.getByRole('button', { name: /Local \(default\)/ })).toBeInTheDocument();
    });
});
