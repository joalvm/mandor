import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ConsoleEntries } from '../../../src/components/console/ConsoleEntries.js';
import type { ConsoleEntry } from '../../../src/components/console/console-entry.js';
import { consoleTime } from '../../../src/components/console/console-time.js';

const AT = new Date(2026, 10, 24, 9, 5, 7, 42).getTime();

function entryOf(entry: Partial<ConsoleEntry> & Pick<ConsoleEntry, 'key'>): ConsoleEntry {
    return { at: AT, level: 'log', text: entry.key, ...entry };
}

function draw(entries: ConsoleEntry[], showTimestamps = false) {
    return render(
        <ConsoleEntries
            empty="Nada todavía."
            entries={entries}
            label="Consola"
            showTimestamps={showTimestamps}
        />,
    );
}

afterEach(() => {
    cleanup();
});

// The row is ConsoleEntryRow, what opens under it ConsoleEntryBody and what a part holds
// ConsoleValue, all drawn here by the list.
describe('the entries of a console', () => {
    it('says so while nothing was written', () => {
        draw([]);

        expect(screen.getByText('Nada todavía.')).toBeVisible();
    });

    it('draws each entry in its level, with its status, its time and where it came from', () => {
        draw([
            entryOf({ key: 'a', text: 'hola', source: 'Ventana' }),
            entryOf({
                key: 'b',
                level: 'error',
                text: 'GET /x',
                status: { text: '404 Not Found', outcome: 'refused' },
                time: '3 ms',
            }),
        ]);

        const items = within(screen.getByRole('list', { name: 'Consola' })).getAllByRole(
            'listitem',
        );

        expect(items.map((item) => item.dataset['level'])).toEqual(['log', 'error']);
        expect(items[0]).toHaveTextContent('holaVentana');
        expect(items[1]).toHaveTextContent('GET /x404 Not Found3 ms');
    });

    it('stamps each entry with the time it was written when asked to', () => {
        draw([entryOf({ key: 'a' })], true);

        expect(consoleTime(AT)).toBe('09:05:07.042');
        expect(screen.getByText('09:05:07.042')).toBeVisible();
    });

    it('opens an entry with nothing under it never, and one with a detail on a click', () => {
        draw([entryOf({ key: 'a' }), entryOf({ key: 'b', detail: 'por qué' })]);

        expect(screen.getAllByRole('button')).toHaveLength(1);

        const line = screen.getByRole('button', { name: /b/u });

        expect(line).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(line);

        expect(line).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('por qué')).toBeVisible();

        fireEvent.click(line);

        expect(screen.queryByText('por qué')).toBeNull();
    });

    it('opens each part of an entry on its own: a tree of fields, or text as it came', () => {
        draw([
            entryOf({
                key: 'a',
                sections: [
                    { title: 'Headers', value: { accept: '*/*', count: 2 } },
                    { title: 'Body', value: '<b>no markup</b>' },
                ],
            }),
        ]);

        fireEvent.click(screen.getByRole('button', { name: /a/u }));
        fireEvent.click(screen.getByRole('button', { name: 'Headers' }));

        const headers = screen.getByRole('region', { name: 'Headers' });

        expect(headers).toHaveTextContent('accept: "*/*"');
        expect(headers).toHaveTextContent('count: 2');
        expect(screen.queryByText('<b>no markup</b>')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Body' }));

        expect(screen.getByText('<b>no markup</b>')).toBeVisible();
    });
});
