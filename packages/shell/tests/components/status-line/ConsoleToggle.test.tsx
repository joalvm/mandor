import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
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

    it('counts the faults and the warnings the console holds, and nothing when there are none', () => {
        draw();

        expect(screen.queryByLabelText(/error/u)).toBeNull();
        expect(screen.queryByLabelText(/aviso/u)).toBeNull();

        act(() => {
            writeConsole({ id: 'a', title: 'GET altas' }, [
                { key: '1', tone: 'error', text: 'Error: no' },
                { key: '2', tone: 'error', text: 'Error: otra' },
                { key: '3', tone: 'warn', text: 'cuidado' },
                { key: '4', tone: 'log', text: 'hola' },
            ]);
        });

        expect(screen.getByLabelText('2 errores')).toHaveTextContent('2');
        expect(screen.getByLabelText('1 aviso')).toHaveTextContent('1');
    });
});
