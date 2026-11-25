import { resolvePreferenceValues, type PreferenceValues } from '@mandor/schema';
import { formattedJsonc } from '@mandor/ui';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useAppliedCodePreferences } from '../../src/hooks/useAppliedCodePreferences.js';

function applied(app: PreferenceValues) {
    return renderHook(
        ({ values }) => {
            useAppliedCodePreferences(values);
        },
        { initialProps: { values: resolvePreferenceValues({ app }) } },
    );
}

afterEach(() => {
    cleanup();
});

/** A payload laid out by a button shows the indent the editors write with. */
describe('the code editors of the window, as the settings say', () => {
    it('writes four spaces a level until told otherwise', () => {
        applied({});

        expect(formattedJsonc('{"a":1}')).toBe('{\n    "a": 1\n}');
    });

    it('writes with the indent the person set, and with the default once the window goes', () => {
        const { unmount } = applied({ 'editor.indentSize': '2' });

        expect(formattedJsonc('{"a":1}')).toBe('{\n  "a": 1\n}');

        unmount();

        expect(formattedJsonc('{"a":1}')).toBe('{\n    "a": 1\n}');
    });

    it('steps in with tabs when the person chose them, as the settings change', () => {
        const { rerender } = applied({});

        rerender({ values: resolvePreferenceValues({ app: { 'editor.indentType': 'tabs' } }) });

        expect(formattedJsonc('{"a":1}')).toBe('{\n\t"a": 1\n}');
    });
});
