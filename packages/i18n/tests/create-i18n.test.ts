import { describe, expect, it } from 'vitest';

import { createI18n } from '../src/create-i18n.js';

describe('createI18n', () => {
    it('answers at once in the default language when none is given', () => {
        const instance = createI18n();

        expect(instance.isInitialized).toBe(true);
        expect(instance.language).toBe('en');
        expect(instance.t('menu:quit')).toBe('Quit');
    });

    it('answers in the language it was made for, filling the values in', () => {
        const instance = createI18n('es');

        expect(instance.t('menu:aboutApp', { name: 'Mandor' })).toBe('Acerca de Mandor');
    });

    it('falls back to the default language for one it does not speak', () => {
        expect(createI18n('fr').t('menu:quit')).toBe('Quit');
    });

    it('keeps one instance apart from the next', () => {
        const english = createI18n('en');
        const spanish = createI18n('es');

        expect(english.t('menu:copy')).toBe('Copy');
        expect(spanish.t('menu:copy')).toBe('Copiar');
        expect(english).not.toBe(spanish);
    });
});
