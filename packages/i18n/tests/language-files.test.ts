import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { readLocales } from '../tools/locale-files.mjs';
import {
    pluralFormsOf,
    validateResources,
    type Locales,
    type Messages,
} from '../tools/resource-schema.mjs';

const LANG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lang');
const PLURAL_FORM = /_(zero|one|two|few|many|other)$/;

/** Every key of a namespace by its path, a plural group by the key a call site names. */
function keysOf(messages: Messages, at = ''): string[] {
    const keys = Object.entries(messages).flatMap(([key, value]) =>
        typeof value === 'string'
            ? [`${at}${key.replace(PLURAL_FORM, '')}`]
            : keysOf(value, `${at}${key}.`),
    );

    return [...new Set(keys)].sort();
}

function localesOf(languages: Record<string, Messages>): Locales {
    return new Map(
        Object.entries(languages).map(([language, messages]) => [
            language,
            new Map([['shell', messages]]),
        ]),
    );
}

const ENGLISH: Messages = { tabs_one: '{{count}} tab', tabs_other: '{{count}} tabs', title: 'Hi' };

describe('the language files', () => {
    it('give every language every key of English', async () => {
        const { locales } = await readLocales(LANG_ROOT);
        const english = locales.get('en');
        const complete = [...locales].filter(([language]) => !language.includes('-'));

        expect(complete.length).toBeGreaterThan(1);

        for (const [language, namespaces] of complete) {
            for (const [namespace, messages] of english ?? []) {
                expect(keysOf(namespaces.get(namespace) ?? {}), `${language}/${namespace}`).toEqual(
                    keysOf(messages),
                );
            }
        }
    });

    it('keep the message contract, plural forms included', async () => {
        const { locales } = await readLocales(LANG_ROOT);

        expect(() => {
            validateResources(locales);
        }).not.toThrow();
    });
});

describe('the plural forms of a language', () => {
    it.each([
        ['en', ['one', 'other']],
        ['es', ['one', 'other']],
        ['ru', ['one', 'few', 'many', 'other']],
        ['ar', ['zero', 'one', 'two', 'few', 'many', 'other']],
        ['zh', ['other']],
    ])('demand of %s the forms a small count reaches', (language, required) => {
        expect(pluralFormsOf(language).required).toEqual(required);
    });

    it('let a language without a singular say a plural with its one form', () => {
        const locales = localesOf({
            en: ENGLISH,
            zh: { tabs_other: '{{count}} 个标签页', title: '你好' },
        });

        expect(() => {
            validateResources(locales);
        }).not.toThrow();
    });

    it('take the forms English does not have from the rules of the language', () => {
        const russian = {
            tabs_few: '{{count}} вкладки',
            tabs_many: '{{count}} вкладок',
            tabs_one: '{{count}} вкладка',
            tabs_other: '{{count}} вкладки',
            title: 'Привет',
        };

        expect(() => {
            validateResources(localesOf({ en: ENGLISH, ru: russian }));
        }).not.toThrow();
    });

    it('refuse a language that leaves out a form its counts take', () => {
        const russian = {
            tabs_one: '{{count}} вкладка',
            tabs_other: '{{count}} вкладки',
            title: 'Привет',
        };

        expect(() => {
            validateResources(localesOf({ en: ENGLISH, ru: russian }));
        }).toThrow(/ru\/shell\.json/);
    });

    it('refuse a form the language does not have', () => {
        const spanish = {
            tabs_one: '{{count}} pestaña',
            tabs_other: '{{count}} pestañas',
            tabs_two: '{{count}} pestañas',
            title: 'Hola',
        };

        expect(() => {
            validateResources(localesOf({ en: ENGLISH, es: spanish }));
        }).toThrow(/es\/shell\.json/);
    });

    it('refuse a key English does not say', () => {
        expect(() => {
            validateResources(localesOf({ en: ENGLISH, es: { ...ENGLISH, extra: 'Más' } }));
        }).toThrow(/es\/shell\.json/);
    });
});
