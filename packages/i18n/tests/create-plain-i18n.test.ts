import type { i18n } from 'i18next';
import { describe, expect, it } from 'vitest';

import { createPlainI18n } from '../src/create-plain-i18n.js';

/**
 * Main reads the menu words by their bare key, without the window's typing of the keys, whose
 * default namespace is another one: the test reads them the way main does.
 */
function read(instance: i18n, key: string, values?: Record<string, string>): string {
    const t = instance.t as unknown as (key: string, values?: Record<string, string>) => string;

    return t(key, values);
}

describe('createPlainI18n', () => {
    it('reads a bare key from the menu words, in the default language', () => {
        const instance = createPlainI18n();

        expect(instance.isInitialized).toBe(true);
        expect(read(instance, 'quit')).toBe('Quit');
    });

    it('answers in the language it was made for, filling the values in', () => {
        expect(read(createPlainI18n('es'), 'aboutApp', { name: 'Mandor' })).toBe(
            'Acerca de Mandor',
        );
    });

    it('still reaches the words of another namespace by its prefix', () => {
        expect(createPlainI18n('en').t('shell:closeTab')).toBe('Close tab');
    });

    it('falls back to the default language for one it does not speak', () => {
        expect(read(createPlainI18n('fr'), 'copy')).toBe('Copy');
    });
});
