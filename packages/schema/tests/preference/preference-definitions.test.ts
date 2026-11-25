import { describe, expect, it } from 'vitest';

import { EDITOR_PREFERENCES } from '../../src/preference/editor-preferences.js';
import { INTERFACE_PREFERENCES } from '../../src/preference/interface-preferences.js';
import { acceptsPreferenceValue } from '../../src/preference/preference-definition.js';
import { PREFERENCE_DEFINITIONS } from '../../src/preference/preference-definitions.js';
import { RETENTION_PREFERENCES } from '../../src/preference/retention-preferences.js';
import { THEME_IDS } from '../../src/preference/theme-id.js';

describe('PREFERENCE_DEFINITIONS', () => {
    it('names each preference once', () => {
        const keys = PREFERENCE_DEFINITIONS.map((definition) => definition.key);

        expect(new Set(keys).size).toBe(keys.length);
    });

    it.each(PREFERENCE_DEFINITIONS.map((definition) => [definition.key, definition] as const))(
        '%s has a default it takes',
        (_key, definition) => {
            expect(acceptsPreferenceValue(definition, definition.defaultValue)).toBe(true);
        },
    );

    it.each(PREFERENCE_DEFINITIONS.map((definition) => [definition.key, definition] as const))(
        '%s has a label and a help text in the preferences namespace',
        (_key, definition) => {
            expect(definition.labelKey).toMatch(/^preferences:\w+$/);
            expect(definition.helpKey).toBe(`${definition.labelKey}Help`);
        },
    );

    it('draws the three choices of a theme from the same list of themes', () => {
        const themed = PREFERENCE_DEFINITIONS.filter(
            (definition) =>
                definition.key.startsWith('appearance.theme') &&
                definition.key !== 'appearance.themeMode',
        );

        expect(themed).toHaveLength(3);

        for (const definition of themed) {
            expect('values' in definition && definition.values).toBe(THEME_IDS);
        }
    });

    it('offers two densities, the comfortable one by default', () => {
        const density = PREFERENCE_DEFINITIONS.find(
            (definition) => definition.key === 'appearance.density',
        );

        expect(density).toMatchObject({
            defaultValue: 'comfortable',
            section: 'themes',
            type: 'select',
            values: ['comfortable', 'compact'],
        });
    });

    /** The window moves as the system asks unless the reader says otherwise, either way. */
    it('offers three ways to move, following the system by default', () => {
        const motion = PREFERENCE_DEFINITIONS.find(
            (definition) => definition.key === 'appearance.motion',
        );

        expect(motion).toMatchObject({
            defaultValue: 'system',
            section: 'themes',
            type: 'select',
            values: ['system', 'full', 'reduced'],
        });
    });

    it('carries the groups of the interface, the editor and the past, each in a section of its own', () => {
        const sections = (group: readonly { section: string }[]) =>
            new Set(group.map((definition) => definition.section));

        expect(PREFERENCE_DEFINITIONS).toEqual(expect.arrayContaining([...INTERFACE_PREFERENCES]));
        expect(PREFERENCE_DEFINITIONS).toEqual(expect.arrayContaining([...EDITOR_PREFERENCES]));
        expect(PREFERENCE_DEFINITIONS).toEqual(expect.arrayContaining([...RETENTION_PREFERENCES]));
        expect(sections(INTERFACE_PREFERENCES)).toEqual(new Set(['interface']));
        expect(sections(EDITOR_PREFERENCES)).toEqual(new Set(['editor']));
        expect(sections(RETENTION_PREFERENCES)).toEqual(new Set(['history', 'activity']));
    });

    /** What the window did before the settings existed is what it keeps doing until changed. */
    it('starts the interface and the editor where the window already stood', () => {
        const defaults = Object.fromEntries(
            [...INTERFACE_PREFERENCES, ...EDITOR_PREFERENCES].map((definition) => [
                definition.key,
                definition.defaultValue,
            ]),
        );

        expect(defaults).toEqual({
            'editor.autoClose': 'on',
            'editor.fontFamily': '',
            'editor.fontSize': '12',
            'editor.indentSize': '4',
            'editor.indentType': 'spaces',
            'editor.wordWrap': 'on',
            'tabs.alwaysNew': 'off',
            'tabs.askUnsaved': 'on',
            'tabs.closedKept': '20',
        });
    });

    it('keeps 500 sends for 30 days and 500 entries of activity until told otherwise', () => {
        expect(
            Object.fromEntries(
                RETENTION_PREFERENCES.map((definition) => [
                    definition.key,
                    definition.defaultValue,
                ]),
            ),
        ).toEqual({
            'activity.maxEntries': '500',
            'history.maxAgeDays': '30',
            'history.maxEntries': '500',
        });
    });

    it('reads every option of a list of amounts as a whole number', () => {
        const amounts = PREFERENCE_DEFINITIONS.flatMap((definition) =>
            'unitKey' in definition ? definition.values : [],
        );

        expect(amounts.length).toBeGreaterThan(0);
        expect(amounts.every((amount) => /^[1-9]\d*$/.test(amount))).toBe(true);
    });

    it('keeps every preference at the level of the app', () => {
        expect(new Set(PREFERENCE_DEFINITIONS.map((definition) => definition.scope))).toEqual(
            new Set(['app']),
        );
    });
});
