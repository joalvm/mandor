import { describe, expect, it } from 'vitest';

import { recordsOf } from '../../src/console/console-entries.js';
import { visibleEntries } from '../../src/console/console-filter.js';

const ENTRIES = recordsOf(
    [
        { level: 'log', text: 'hola', source: 'Ventana' },
        { level: 'error', text: 'POST /a', detail: 'ENOTFOUND', network: true },
        { level: 'warn', text: 'cuidado', source: 'GET Altas' },
    ],
    0,
    0,
);

function textsOf(filter: Partial<Parameters<typeof visibleEntries>[1]>): string[] {
    return visibleEntries(ENTRIES, { level: 'all', query: '', showNetwork: true, ...filter }).map(
        (entry) => entry.text,
    );
}

describe('what the console shows of what it holds', () => {
    it('shows every entry, the same list, while nothing narrows it', () => {
        expect(visibleEntries(ENTRIES, { level: 'all', query: ' ', showNetwork: true })).toBe(
            ENTRIES,
        );
    });

    it('shows one level', () => {
        expect(textsOf({ level: 'error' })).toEqual(['POST /a']);
    });

    it('shows what holds the text in its line, its detail or its source, in any case', () => {
        expect(textsOf({ query: 'HOLA' })).toEqual(['hola']);
        expect(textsOf({ query: 'enotfound' })).toEqual(['POST /a']);
        expect(textsOf({ query: 'altas' })).toEqual(['cuidado']);
    });

    it('hides the requests that went out to the network when asked', () => {
        expect(textsOf({ showNetwork: false })).toEqual(['hola', 'cuidado']);
    });
});
