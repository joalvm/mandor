import type { i18n, TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { createPlainI18n } from '../src/create-plain-i18n.js';

/**
 * Main reads the menu words by their bare key, because the menu is the default namespace of this
 * instance. The window's typing of the keys has another default, so the test names the menu
 * namespace, and checks apart that it is the default one.
 */
function menuOf(instance: i18n): TFunction<'menu'> {
    return instance.getFixedT(null, 'menu');
}

describe('createPlainI18n', () => {
    it('reads a bare key from the menu words, in the default language', () => {
        const instance = createPlainI18n();

        expect(instance.isInitialized).toBe(true);
        expect(instance.options.defaultNS).toBe('menu');
        expect(menuOf(instance)('quit')).toBe('Quit');
    });

    it('answers in the language it was made for, filling the values in', () => {
        expect(menuOf(createPlainI18n('es'))('aboutApp', { name: 'Mandor' })).toBe(
            'Acerca de Mandor',
        );
    });

    it('still reaches the words of another namespace by its prefix', () => {
        expect(createPlainI18n('en').t('shell:closeTab')).toBe('Close tab');
    });

    it('falls back to the default language for one it does not speak', () => {
        expect(menuOf(createPlainI18n('fr'))('copy')).toBe('Copy');
    });
});
