import { describe, expect, it } from 'vitest';

import { preferenceOptionKey, preferenceOptionLabel } from '../src/lib/preference-option-key.js';

describe('the key of the message that names one option of a preference', () => {
    it('is built from the preference and the option, in the preferences bundle', () => {
        expect(preferenceOptionKey({ key: 'appearance.language' }, 'en')).toBe(
            'preferences:appearance-language-en',
        );
        expect(preferenceOptionKey({ key: 'appearance.themeManual' }, 'dark-contrast')).toBe(
            'preferences:appearance-themeManual-dark-contrast',
        );
    });

    it('replaces the dot of the key with the dash that message keys carry', () => {
        expect(preferenceOptionKey({ key: 'appearance.themeMode' }, 'system')).toBe(
            'preferences:appearance-themeMode-system',
        );
    });
});

describe('the words one option of a preference reads as', () => {
    function said(key: string, values?: Record<string, number | string>): string {
        return values === undefined ? key : `${key}(${String(values['count'])})`;
    }

    it('names an option by its own message', () => {
        expect(preferenceOptionLabel({ key: 'editor.indentType' }, 'tabs', said)).toBe(
            'preferences:editor-indentType-tabs',
        );
    });

    it('reads an option of a list of amounts as that many of its unit', () => {
        expect(
            preferenceOptionLabel(
                { key: 'history.maxAgeDays', unitKey: 'preferences:unitDays' },
                '30',
                said,
            ),
        ).toBe('preferences:unitDays(30)');
    });
});
