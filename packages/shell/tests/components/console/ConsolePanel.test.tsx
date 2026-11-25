import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ConsolePanel } from '../../../src/components/console/ConsolePanel.js';
import { setConsoleSettings } from '../../../src/console/console-settings.js';
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

function shown(): (string | undefined)[][] {
    return within(screen.getByRole('list', { name: 'Lo escrito en la consola' }))
        .getAllByRole('listitem')
        .map((item) => [item.dataset['level'], item.textContent]);
}

afterEach(() => {
    cleanup();
    consoleStore.getState().clear();
    consoleStore.getState().hide();
    setConsoleSettings({ level: 'all', showNetwork: true, showTimestamps: false });
    window.localStorage.clear();
});

// The settings behind the gear are ConsoleSettingsMenu, drawn here as the bar holds it.
describe('the console panel', () => {
    it('says so while nothing was written', () => {
        draw();

        expect(screen.getByRole('region', { name: 'Consola' })).toBeVisible();
        expect(screen.getByText('Nada escrito en la consola todavía.')).toBeVisible();
    });

    it('draws every entry in the order it was written, with where it came from', () => {
        draw();

        act(() => {
            writeConsole([{ level: 'log', text: 'hola', source: 'GET altas' }]);
            writeConsole([{ level: 'error', text: 'Error: no' }]);
        });

        expect(shown()).toEqual([
            ['log', 'holaGET altas'],
            ['error', 'Error: no'],
        ]);
    });

    it('filters by text and by level, and says so when nothing is left', () => {
        writeConsole([
            { level: 'log', text: 'hola' },
            { level: 'error', text: 'Error: no' },
        ]);
        draw();

        const filter = screen.getByRole('searchbox', { name: 'Filtrar la consola' });

        filter.textContent = 'hola';
        fireEvent.input(filter);

        expect(shown()).toEqual([['log', 'hola']]);

        act(() => {
            setConsoleSettings({ level: 'error' });
        });

        expect(screen.getByText('Nada en la consola coincide con el filtro.')).toBeVisible();
    });

    it('stamps each entry with its time once the setting asks for it', () => {
        writeConsole([{ level: 'log', text: 'hola' }]);
        draw();

        fireEvent.click(screen.getByRole('button', { name: 'Ajustes de la consola' }));
        fireEvent.click(screen.getByRole('switch', { name: 'Mostrar la hora de cada entrada' }));

        // The settings stay open over the console, which hides it from the accessible tree.
        expect(screen.getByRole('listitem', { hidden: true }).querySelector('time')).not.toBeNull();
        expect(window.localStorage.getItem('mandor.console')).toContain('"showTimestamps":true');
    });

    it('opens an entry to read what happened and each of its parts', () => {
        writeConsole([
            {
                level: 'error',
                text: 'POST http://x',
                detail: 'getaddrinfo ENOTFOUND x',
                sections: [{ title: 'Headers', value: { accept: '*/*' } }],
            },
        ]);
        draw();

        expect(screen.queryByText('getaddrinfo ENOTFOUND x')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /POST http:\/\/x/u }));

        expect(screen.getByText('getaddrinfo ENOTFOUND x')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Headers' }));

        expect(screen.getByRole('region', { name: 'Headers' })).toHaveTextContent('accept');
    });

    it('is emptied and put away by hand', () => {
        consoleStore.getState().show();
        writeConsole([{ level: 'log', text: 'hola' }]);
        draw();

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar la consola' }));

        expect(consoleStore.getState().entries).toEqual([]);
        expect(screen.getByText('Nada escrito en la consola todavía.')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Ocultar la consola' }));

        expect(consoleStore.getState().open).toBe(false);
    });
});
