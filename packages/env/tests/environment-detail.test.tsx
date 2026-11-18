import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { createEnvironment, type Variable } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnvironmentsDialog, envStore } from '../src/index.js';

const AFTER_DEBOUNCE = 1000;

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

/** The dialog on one environment named Local, holding `variables`. */
function openWith(variables: Variable[] = []): void {
    envStore.setState({
        environments: [createEnvironment({ id: 'local', name: 'Local', variables })],
    });
    render(
        <EnvironmentsDialog
            environmentId={null}
            onOpenChange={vi.fn()}
            open
            workspaceId="payments"
        />,
        { wrapper: Wrapper },
    );
}

function write(field: HTMLElement | undefined, value: string): void {
    if (field === undefined) {
        throw new Error('no such field');
    }

    field.textContent = value;
    fireEvent.input(field);
}

function keys(): HTMLElement[] {
    return screen.getAllByRole('textbox', { name: 'Key' });
}

beforeEach(() => {
    vi.useFakeTimers();
    envStore.getState().reset();
    vi.spyOn(bridge.environment, 'update').mockImplementation(({ changes }) =>
        Promise.resolve(success(createEnvironment({ id: 'local', name: changes.name ?? 'Local' }))),
    );
});

afterEach(() => {
    cleanup();

    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('the variables of the environment on screen (EnvironmentDetail)', () => {
    /**
     * The first keystroke in the empty row turns it into a line. The line keeps the identity the
     * table gave it, so the focus the table sent after it finds it and the typing goes on there.
     */
    it('keeps the focus in the line the empty row gave birth to', () => {
        openWith();
        write(keys()[0], 'h');

        const [born, empty] = keys();

        expect(born).toHaveFocus();
        expect(born).toHaveTextContent('h');
        expect(empty).toHaveTextContent('');
    });

    it('marks a key the environment cannot be kept under, and keeps the file as it was', async () => {
        openWith();
        write(keys()[0], 'two words');

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(keys()[0]).toHaveAttribute('aria-invalid', 'true');
        expect(bridge.environment.update).not.toHaveBeenCalled();
    });

    it('writes the lines that say something and leaves a wholly empty one out', async () => {
        openWith([{ enabled: true, name: 'host', secret: false, value: 'api.test' }]);
        write(keys()[0], '');
        write(screen.getAllByRole('textbox', { name: 'Value' })[0], '');
        write(keys()[1], 'port');

        expect(keys()[0]).not.toHaveAttribute('aria-invalid', 'true');

        await act(() => vi.advanceTimersByTimeAsync(AFTER_DEBOUNCE));

        expect(bridge.environment.update).toHaveBeenLastCalledWith({
            workspaceId: 'payments',
            environmentId: 'local',
            changes: {
                name: 'Local',
                variables: [{ enabled: true, name: 'port', secret: false, value: '' }],
            },
        });
    });
});
