import type * as Schema from '@mandor/schema';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferencesApplication } from '../src/preferences-application.js';
import { PreferencesProvider } from '../src/preferences-context.js';

/**
 * No language written from the right ships yet: one made up for the test, `qaa` (a code kept for
 * private use), joins the table the picker, the preferences and the window read their languages
 * from. The real functions run; only the table they are handed grows.
 */
vi.mock('@mandor/schema', async (importOriginal) => {
    const schema = await importOriginal<typeof Schema>();
    const languages = [
        ...schema.INTERFACE_LANGUAGES,
        { code: 'qaa', direction: 'rtl', name: 'Fake' },
    ] as const;
    const definitions = schema.PREFERENCE_DEFINITIONS.map((definition) =>
        definition.key === 'appearance.language'
            ? { ...definition, values: languages.map(({ code }) => code) }
            : definition,
    );

    return {
        ...schema,
        PREFERENCE_DEFINITIONS: definitions,
        resolvePreferenceValues: (layers: Parameters<typeof Schema.resolvePreferenceValues>[0]) =>
            schema.resolvePreferenceValues(layers, definitions),
        textDirectionOf: (code: string) => schema.textDirectionOf(code, languages),
    };
});

afterEach(() => {
    cleanup();

    window.localStorage.clear();
});

describe('a language written from the right', () => {
    it('turns the whole window to run from the right, and back when it closes', () => {
        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'appearance.language': 'qaa' }),
        );

        const { unmount } = render(
            <PreferencesProvider>
                <PreferencesApplication />
            </PreferencesProvider>,
        );

        expect(document.documentElement).toHaveAttribute('lang', 'qaa');
        expect(document.documentElement).toHaveAttribute('dir', 'rtl');

        unmount();

        expect(document.documentElement).not.toHaveAttribute('dir');
    });

    it('keeps a language written from the left running from the left', () => {
        window.localStorage.setItem(
            'mandor.preferences',
            JSON.stringify({ 'appearance.language': 'es' }),
        );

        render(
            <PreferencesProvider>
                <PreferencesApplication />
            </PreferencesProvider>,
        );

        expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    });
});
