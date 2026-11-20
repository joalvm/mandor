import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider, TooltipProvider, useToast, type ToastRequest } from '../../src/index.js';
import { allByPart, byPart } from '../../src/testing/by-part.js';

const messages = { close: 'Cerrar', more: (count: number) => `${String(count)} más` };

function Trigger({ requests }: { requests: readonly ToastRequest[] }) {
    const { notify } = useToast();

    return (
        <button
            onClick={() => {
                for (const request of requests) {
                    notify(request);
                }
            }}
            type="button"
        >
            Avisar
        </button>
    );
}

function notice(title: string, tone: ToastRequest['tone'] = 'info'): ToastRequest {
    return { title, tone };
}

/** The visible stack, without the mirror Radix keeps for the screen reader. */
function toasts(): HTMLElement[] {
    return allByPart('toast');
}

function raise(requests: readonly ToastRequest[], onNotify?: (request: ToastRequest) => void) {
    render(
        <TooltipProvider>
            <ToastProvider messages={messages} onNotify={onNotify}>
                <Trigger requests={requests} />
            </ToastProvider>
        </TooltipProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Avisar' }));
}

describe('the toast channel', () => {
    it('shows the notice raised from under the provider', () => {
        raise([notice('Conexión abierta', 'success')]);

        expect(toasts()).toHaveLength(1);
        expect(toasts()[0]).toHaveTextContent('Conexión abierta');
    });

    /** The tone is what the colour, the icon and the expiry all read from. */
    it('carries the tone of every notice down to the stack', () => {
        raise([notice('Todo bien', 'info'), notice('Todo mal', 'error')]);

        expect(toasts().map((toast) => toast.getAttribute('data-tone'))).toEqual(['info', 'error']);
    });

    /** Three at a time is the cap; the rest are counted, never stacked off the screen. */
    it('keeps three notices on screen and counts the ones left behind', () => {
        raise([notice('Uno'), notice('Dos'), notice('Tres'), notice('Cuatro'), notice('Cinco')]);

        expect(toasts().map((toast) => toast.textContent)).toEqual([
            expect.stringContaining('Tres'),
            expect.stringContaining('Cuatro'),
            expect.stringContaining('Cinco'),
        ]);
        expect(byPart('toast-overflow')).toHaveTextContent('2 más');
    });

    it('closes a notice from its close control', () => {
        raise([notice('Conexión abierta', 'success')]);

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

        expect(toasts()).toHaveLength(0);
    });

    /**
     * The glyph, the first line and the way out share one read, each centred on the title's
     * line; the notice cuts before it grows a page — two lines of title, three of detail.
     */
    it('caps the title at two lines and the detail at three', () => {
        raise([
            {
                detail: 'El server tardó 30 segundos en responder.',
                title: 'Todo mal',
                tone: 'info',
            },
        ]);

        const toast = toasts()[0];

        expect(toast).toBeDefined();

        if (toast === undefined) {
            return;
        }

        expect(within(toast).getByText('Todo mal')).toHaveClass('line-clamp-2');
        expect(within(toast).getByText('El server tardó 30 segundos en responder.')).toHaveClass(
            'line-clamp-3',
        );
        // A card that floats over the window: its width and its round are those of the scale.
        expect(toast).toHaveClass('rounded-overlay');
        expect(toast.parentElement).toHaveClass('w-toast');
        expect(toast.parentElement).not.toHaveClass('w-80');
    });

    /**
     * One action at most, and the toast carries it as a secondary button under its text; never a
     * link, and never a second row of buttons.
     */
    it('runs the single action of a notice', () => {
        const onSelect = vi.fn();

        raise([{ action: { label: 'Deshacer', onSelect }, title: 'Borrado', tone: 'warning' }]);

        const action = screen.getByRole('button', { name: 'Deshacer' });

        fireEvent.click(action);

        expect(onSelect).toHaveBeenCalledOnce();
        expect(action).toHaveAttribute('data-variant', 'secondary');
    });

    it('refuses to raise a notice outside a provider', () => {
        const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() =>
            render(
                <TooltipProvider>
                    <Trigger requests={[]} />
                </TooltipProvider>,
            ),
        ).toThrow('useToast requires a ToastProvider above it.');

        reported.mockRestore();
    });

    /** The stack counts repeats; the notice that follows them is the latest one. */
    it('folds equal notices into one toast with a counter', () => {
        raise([notice('No se pudo guardar', 'error'), notice('No se pudo guardar', 'error')]);

        expect(toasts()).toHaveLength(1);
        expect(toasts()[0]).toHaveTextContent('×2');
    });

    it('shows no counter on a notice raised once', () => {
        raise([notice('No se pudo guardar', 'error')]);

        expect(toasts()[0]).not.toHaveTextContent('×');
    });

    /** Whoever mounts the provider keeps the record; the stack only shows it. */
    it('tells the listener about every notice, folded or not', () => {
        const onNotify = vi.fn();

        raise(
            [notice('Falló', 'error'), notice('Falló', 'error'), notice('Otro', 'warning')],
            onNotify,
        );

        expect(onNotify).toHaveBeenCalledTimes(3);
        expect(onNotify).toHaveBeenLastCalledWith({ title: 'Otro', tone: 'warning' });
    });
});
