import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ConsolePanel } from '../../../src/components/console/ConsolePanel.js';
import { consoleStore, writeConsole } from '../../../src/index.js';

function draw() {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ConsolePanel />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

afterEach(() => {
    cleanup();
    consoleStore.getState().clear();
    consoleStore.getState().hide();
});

describe('the console panel', () => {
    it('says so while nothing was written', () => {
        draw();

        expect(screen.getByRole('region', { name: 'Consola' })).toBeVisible();
        expect(screen.getByText('Nada escrito en la consola todavía.')).toBeVisible();
    });

    it('draws every run under its heading, as it is written', () => {
        draw();

        act(() => {
            writeConsole({ id: 'a', title: 'GET altas' }, [
                { key: '1', tone: 'log', text: 'hola' },
            ]);
            writeConsole({ id: 'b', title: 'POST bajas' }, [
                { key: '1', tone: 'error', text: 'Error: no' },
            ]);
        });

        const lines = within(screen.getByRole('list', { name: 'Lo escrito en la consola' }))
            .getAllByRole('listitem')
            .map((item) => [item.dataset['tone'], item.textContent]);

        expect(lines).toEqual([
            ['heading', 'GET altas'],
            ['log', 'hola'],
            ['heading', 'POST bajas'],
            ['error', 'Error: no'],
        ]);
    });

    it('is emptied and put away by hand', () => {
        consoleStore.getState().show();
        writeConsole({ id: 'a', title: 'GET altas' }, [{ key: '1', tone: 'log', text: 'hola' }]);
        draw();

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar la consola' }));

        expect(consoleStore.getState().runs).toEqual([]);
        expect(screen.getByText('Nada escrito en la consola todavía.')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Ocultar la consola' }));

        expect(consoleStore.getState().open).toBe(false);
    });
});
