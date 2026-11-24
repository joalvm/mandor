import { afterEach, describe, expect, it } from 'vitest';

import {
    consoleSettingsStore,
    readConsoleSettings,
    setConsoleSettings,
} from '../../src/console/console-settings.js';

const KEY = 'mandor.console';

afterEach(() => {
    setConsoleSettings({ level: 'all', showNetwork: true, showTimestamps: false });
    window.localStorage.removeItem(KEY);
});

describe('how the console reads, kept on this machine', () => {
    it('reads every entry, without the time, and the requests too, when nothing was kept', () => {
        expect(readConsoleSettings()).toEqual({
            level: 'all',
            showNetwork: true,
            showTimestamps: false,
        });
    });

    it('keeps what is chosen for the next time the window opens', () => {
        setConsoleSettings({ showTimestamps: true, level: 'error' });

        expect(consoleSettingsStore.getState()).toMatchObject({
            showTimestamps: true,
            level: 'error',
        });
        expect(readConsoleSettings()).toEqual({
            level: 'error',
            showNetwork: true,
            showTimestamps: true,
        });
    });

    it('takes the default for each field kept wrong, and for what is not JSON', () => {
        window.localStorage.setItem(KEY, JSON.stringify({ level: 'loud', showNetwork: false }));

        expect(readConsoleSettings()).toEqual({
            level: 'all',
            showNetwork: false,
            showTimestamps: false,
        });

        window.localStorage.setItem(KEY, '[');

        expect(readConsoleSettings().level).toBe('all');

        window.localStorage.setItem(KEY, '7');

        expect(readConsoleSettings().showNetwork).toBe(true);
    });
});
