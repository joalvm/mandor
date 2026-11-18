import { createI18n } from '@mandor/i18n';
import { describe, expect, it } from 'vitest';

import { sectionTitle } from '../../src/lib/section-title.js';

const messages = createI18n('es').getFixedT('es', 'conflicts');

describe('what a part of an entity is called (section-title)', () => {
    it('uses the words of the app for a part it knows', () => {
        expect(sectionTitle(messages, 'headers')).toBe('Headers');
        expect(sectionTitle(messages, 'body')).toBe('Body');
    });

    it('calls the whole file the file', () => {
        expect(sectionTitle(messages, '')).toBe('Archivo');
    });

    it('shows the key itself for a part nobody named', () => {
        expect(sectionTitle(messages, 'brandNew')).toBe('brandNew');
    });
});
