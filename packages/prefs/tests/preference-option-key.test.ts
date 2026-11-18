import { describe, expect, it } from 'vitest';

import { preferenceOptionKey } from '../src/lib/preference-option-key.js';

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
