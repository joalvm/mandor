import { describe, expect, it } from 'vitest';

import { PREFERENCE_DEFINITIONS } from '../../src/preference/preference-definitions.js';
import { resolvePreferenceValues } from '../../src/preference/preference-values.js';

describe('resolvePreferenceValues', () => {
    it('gives every preference its default when nothing is stored', () => {
        const resolved = resolvePreferenceValues({});

        expect(Object.keys(resolved)).toEqual(PREFERENCE_DEFINITIONS.map((each) => each.key));
        expect(resolved['appearance.language']).toBe('en');
        expect(resolved['updates.channel']).toBe('stable');
    });

    it('reads a layer that is missing as one that stores nothing', () => {
        expect(resolvePreferenceValues({ workspace: {} })).toEqual(resolvePreferenceValues({}));
    });

    it('lets a narrower scope win over a wider one, in the order app, repo, workspace', () => {
        const resolved = resolvePreferenceValues({
            app: { 'appearance.language': 'es' },
            repo: { 'appearance.language': 'en' },
            workspace: { 'appearance.language': 'es' },
        });

        expect(resolved['appearance.language']).toBe('es');
        expect(
            resolvePreferenceValues({
                app: { 'appearance.language': 'es' },
                repo: { 'appearance.language': 'en' },
            })['appearance.language'],
        ).toBe('en');
    });

    it('falls back to the default, not to a wider scope, when a narrower value is invalid', () => {
        const resolved = resolvePreferenceValues({
            app: { 'appearance.language': 'es' },
            workspace: { 'appearance.language': 'fr' },
        });

        expect(resolved['appearance.language']).toBe('en');
    });

    it('falls back to the default for a value that is not text', () => {
        expect(resolvePreferenceValues({ app: { 'updates.mode': 3 } })['updates.mode']).toBe(
            'auto',
        );
    });

    it('takes a text up to its length and falls back to the default past it', () => {
        expect(
            resolvePreferenceValues({ app: { 'editor.fontFamily': 'JetBrains Mono' } })[
                'editor.fontFamily'
            ],
        ).toBe('JetBrains Mono');
        expect(
            resolvePreferenceValues({ app: { 'editor.fontFamily': 'x'.repeat(201) } })[
                'editor.fontFamily'
            ],
        ).toBe('');
    });

    it('takes a switch only as on or off', () => {
        expect(resolvePreferenceValues({ app: { 'tabs.alwaysNew': 'on' } })['tabs.alwaysNew']).toBe(
            'on',
        );
        expect(
            resolvePreferenceValues({ app: { 'tabs.alwaysNew': 'yes' } })['tabs.alwaysNew'],
        ).toBe('off');
    });

    it('leaves a key it does not know out of the answer', () => {
        const stored = { 'appearance.zoom': '200' } as Record<string, unknown>;

        expect(resolvePreferenceValues({ app: stored })).not.toHaveProperty('appearance.zoom');
    });

    it('treats an undefined value as not stored, so a wider scope still applies', () => {
        const resolved = resolvePreferenceValues({
            app: { 'updates.channel': 'beta' },
            repo: { 'updates.channel': undefined },
        });

        expect(resolved['updates.channel']).toBe('beta');
    });
});
