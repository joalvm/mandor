import { afterEach, describe, expect, it } from 'vitest';

import { consoleStore, showConsole, writeConsole } from '../../src/index.js';

afterEach(() => {
    consoleStore.getState().clear();
    consoleStore.getState().hide();
});

describe('the console of the window', () => {
    it('starts put away and empty', () => {
        expect(consoleStore.getState().open).toBe(false);
        expect(consoleStore.getState().runs).toEqual([]);
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
        writeConsole({ id: 'a', title: 'GET altas' }, [{ key: '1', tone: 'log', text: 'hola' }]);

        expect(consoleStore.getState().runs[0]?.lines[0]?.text).toBe('hola');
        expect(consoleStore.getState().open).toBe(false);

        consoleStore.getState().clear();

        expect(consoleStore.getState().runs).toEqual([]);
    });
});
