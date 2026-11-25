import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { allByPart, byPart } from '@mandor/ui/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ConsoleToggle } from '../../../src/components/status-line/ConsoleToggle.js';
import { consoleStore, writeConsole } from '../../../src/index.js';

function draw() {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ConsoleToggle />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

afterEach(() => {
    cleanup();
    consoleStore.getState().clear();
    consoleStore.getState().hide();
});

describe('the switch of the console on the status line', () => {
    it('brings the console out and puts it away, saying which it will do', () => {
        draw();

        fireEvent.click(screen.getByRole('button', { name: 'Mostrar la consola' }));

        expect(consoleStore.getState().open).toBe(true);
        expect(screen.getByRole('button', { name: 'Ocultar la consola' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Ocultar la consola' }));

        expect(consoleStore.getState().open).toBe(false);
    });

    it('says in its tooltip the keys that bring the console out', async () => {
        draw();

        fireEvent.focus(screen.getByRole('button', { name: 'Mostrar la consola' }));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Mostrar la consola (Ctrl+Alt+C)',
        );
    });

    /** The faults wait on the corner of the glyph, never beside it; warnings leave no mark. */
    it('marks the corner of the switch with the faults, and nothing for warnings', () => {
        draw();

        expect(allByPart('corner-count-mark')).toEqual([]);

        act(() => {
            writeConsole([
                { level: 'error', text: 'Error: no' },
                { level: 'error', text: 'Error: otra' },
                { level: 'warn', text: 'cuidado' },
                { level: 'log', text: 'hola' },
            ]);
        });

        const mark = byPart('corner-count-mark');

        expect(mark.textContent).toBe('2');
        expect(mark).toHaveAttribute('data-tone', 'error');
        expect(byPart('corner-count')).toContainElement(mark);
        expect(byPart('corner-count')).toContainElement(
            screen.getByRole('button', { name: 'Mostrar la consola, 2 errores' }),
        );
        expect(screen.queryByText(/aviso/u)).toBeNull();
    });

    /** Warnings alone wait in the console without a mark, and the name says nothing of them. */
    it('leaves the switch unmarked while the console holds only warnings', () => {
        draw();

        act(() => {
            writeConsole([{ level: 'warn', text: 'cuidado' }]);
        });

        expect(allByPart('corner-count-mark')).toEqual([]);
        expect(screen.getByRole('button', { name: 'Mostrar la consola' })).toBeVisible();
    });

    it('reads more than nine faults as nine and more, and says all of them', () => {
        draw();

        act(() => {
            writeConsole(
                Array.from({ length: 12 }, (_, index) => ({
                    level: 'error' as const,
                    text: `Error: ${String(index)}`,
                })),
            );
        });

        expect(byPart('corner-count-mark').textContent).toBe('9+');
        expect(
            screen.getByRole('button', { name: 'Mostrar la consola, 12 errores' }),
        ).toBeVisible();
    });
});
