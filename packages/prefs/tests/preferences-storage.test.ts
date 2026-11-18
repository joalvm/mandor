import { afterEach, describe, expect, it } from 'vitest';

import {
    PREFERENCE_STORAGE_KEY,
    readAppPreferences,
    writeAppPreferences,
} from '../src/preferences-storage.js';

afterEach(() => {
    window.localStorage.clear();
});

describe('the preferences each app keeps on its own disk', () => {
    it('reads nothing while nothing was written', () => {
        expect(readAppPreferences()).toEqual({});
    });

    it('reads back what it wrote, under its key', () => {
        writeAppPreferences({
            'appearance.language': 'es',
            'appearance.themeNight': 'dark-contrast',
        });

        expect(window.localStorage.getItem(PREFERENCE_STORAGE_KEY)).not.toBeNull();
        expect(readAppPreferences()).toEqual({
            'appearance.language': 'es',
            'appearance.themeNight': 'dark-contrast',
        });
    });

    it('reads nothing from a text that is not an object of JSON', () => {
        for (const stored of ['{roto', '[]', 'null', '"es"']) {
            window.localStorage.setItem(PREFERENCE_STORAGE_KEY, stored);

            expect(readAppPreferences()).toEqual({});
        }
    });

    it('keeps only the preferences it knows', () => {
        window.localStorage.setItem(
            PREFERENCE_STORAGE_KEY,
            JSON.stringify({ 'appearance.language': 'es', unknown: 'value' }),
        );

        expect(readAppPreferences()).toEqual({ 'appearance.language': 'es' });
    });

    it('lets a value that is not one of the options fall to its default', () => {
        window.localStorage.setItem(
            PREFERENCE_STORAGE_KEY,
            JSON.stringify({
                'appearance.language': 'es',
                'appearance.themeDay': 'sepia',
                'appearance.themeMode': 7,
            }),
        );

        expect(readAppPreferences()).toEqual({ 'appearance.language': 'es' });
    });
});

/** `appearance.theme` held system, light or dark until the themes became three choices and a mode. */
describe('the theme chosen before the themes had a mode', () => {
    function readAfterStoring(theme: unknown, more: Record<string, unknown> = {}) {
        window.localStorage.setItem(
            PREFERENCE_STORAGE_KEY,
            JSON.stringify({ 'appearance.theme': theme, ...more }),
        );

        return readAppPreferences();
    }

    it('keeps following the system', () => {
        expect(readAfterStoring('system')).toEqual({ 'appearance.themeMode': 'system' });
    });

    it('holds the light or the dark theme that was chosen', () => {
        expect(readAfterStoring('light')).toEqual({
            'appearance.themeManual': 'light',
            'appearance.themeMode': 'manual',
        });
        expect(readAfterStoring('dark')).toEqual({
            'appearance.themeManual': 'dark',
            'appearance.themeMode': 'manual',
        });
    });

    it('is forgotten when it was something no version offered', () => {
        expect(readAfterStoring('sepia')).toEqual({});
        expect(readAfterStoring(3)).toEqual({});
    });

    it('gives way to a mode chosen since', () => {
        expect(readAfterStoring('dark', { 'appearance.themeMode': 'system' })).toEqual({
            'appearance.themeMode': 'system',
        });
    });

    it('is not written back once read', () => {
        writeAppPreferences(readAfterStoring('dark'));

        expect(window.localStorage.getItem(PREFERENCE_STORAGE_KEY)).not.toContain(
            'appearance.theme"',
        );
    });
});
