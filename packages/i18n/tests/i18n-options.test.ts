import { describe, expect, it } from 'vitest';

import { DEFAULT_LANGUAGE, LANGUAGE_CODES, NAMESPACES } from '../src/generated/resources.js';
import { i18nOptions, rethrowInitError } from '../src/i18n-options.js';

describe('what every translator of the app starts from', () => {
    it('keeps the language and the namespace a place asks for', () => {
        const options = i18nOptions('es', 'menu');

        expect(options.lng).toBe('es');
        expect(options.defaultNS).toBe('menu');
    });

    it('answers synchronously, from every language and namespace the app ships', () => {
        const options = i18nOptions('en', 'shell');

        expect(options.initAsync).toBe(false);
        expect(options.fallbackLng).toBe(DEFAULT_LANGUAGE);
        expect(options.supportedLngs).toEqual([...LANGUAGE_CODES]);
        expect(options.ns).toEqual([...NAMESPACES]);
    });

    it('lets a translator that started well go on', () => {
        expect(() => {
            rethrowInitError(null);
            rethrowInitError(undefined);
        }).not.toThrow();
    });

    it('fails where the translator is made when it could not start', () => {
        expect(() => {
            rethrowInitError(new Error('no resources'));
        }).toThrow('no resources');
    });
});
