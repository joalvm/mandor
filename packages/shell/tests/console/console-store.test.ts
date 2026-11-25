import { afterEach, describe, expect, it, vi } from 'vitest';

import { consoleStore, showConsole, writeConsole } from '../../src/index.js';

afterEach(() => {
    vi.restoreAllMocks();
    consoleStore.getState().clear();
    consoleStore.getState().hide();
});

describe('the console of the window', () => {
    it('starts put away and empty', () => {
        expect(consoleStore.getState().open).toBe(false);
        expect(consoleStore.getState().entries).toEqual([]);
    });

    it('comes out and goes away by hand, and when it is shown from elsewhere', () => {
        consoleStore.getState().toggle();

        expect(consoleStore.getState().open).toBe(true);

        consoleStore.getState().toggle();

        expect(consoleStore.getState().open).toBe(false);

        showConsole();
        showConsole();

        expect(consoleStore.getState().open).toBe(true);
    });

    it('keeps what is written to it without coming out, and forgets it when cleared', () => {
        writeConsole([{ level: 'log', text: 'hola' }]);

        expect(consoleStore.getState().entries[0]?.text).toBe('hola');
        expect(consoleStore.getState().open).toBe(false);

        consoleStore.getState().clear();

        expect(consoleStore.getState().entries).toEqual([]);
    });

    it('stamps each entry with a key of its own and the time it arrived', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1_000);

        writeConsole([
            { level: 'log', text: 'a' },
            { level: 'info', text: 'b' },
        ]);
        consoleStore.getState().clear();
        writeConsole([{ level: 'warn', text: 'c' }]);

        const [entry] = consoleStore.getState().entries;

        expect(entry).toMatchObject({ text: 'c', at: 1_000 });
        expect(['0', '1']).not.toContain(entry?.key);
    });

    it('writes nothing for nothing written', () => {
        const before = consoleStore.getState();

        writeConsole([]);

        expect(consoleStore.getState()).toBe(before);
    });
});
