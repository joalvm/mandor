import { describe, expect, it } from 'vitest';

import {
    PREFERENCE_DEFINITIONS,
    resolvePreferenceValues,
    type PreferenceValues,
} from '../../src/index.js';
import { THEME_IDS } from '../../src/preference/theme-id.js';

describe('the preference schema', () => {
    it('declares only sections backed by existing preferences', () => {
        expect(PREFERENCE_DEFINITIONS).toEqual([
            {
                defaultValue: 'en',
                helpKey: 'preferences:languageHelp',
                key: 'appearance.language',
                labelKey: 'preferences:language',
                scope: 'app',
                section: 'general',
                type: 'select',
                values: ['en', 'es'],
            },
            {
                defaultValue: 'system',
                helpKey: 'preferences:themeModeHelp',
                key: 'appearance.themeMode',
                labelKey: 'preferences:themeMode',
                scope: 'app',
                section: 'themes',
                type: 'select',
                values: ['system', 'manual'],
            },
            {
                defaultValue: 'light',
                helpKey: 'preferences:themeDayHelp',
                key: 'appearance.themeDay',
                labelKey: 'preferences:themeDay',
                scope: 'app',
                section: 'themes',
                type: 'select',
                values: ['light', 'light-contrast', 'dark', 'dark-contrast'],
            },
            {
                defaultValue: 'dark',
                helpKey: 'preferences:themeNightHelp',
                key: 'appearance.themeNight',
                labelKey: 'preferences:themeNight',
                scope: 'app',
                section: 'themes',
                type: 'select',
                values: ['light', 'light-contrast', 'dark', 'dark-contrast'],
            },
            {
                defaultValue: 'light',
                helpKey: 'preferences:themeManualHelp',
                key: 'appearance.themeManual',
                labelKey: 'preferences:themeManual',
                scope: 'app',
                section: 'themes',
                type: 'select',
                values: ['light', 'light-contrast', 'dark', 'dark-contrast'],
            },
            {
                defaultValue: 'auto',
                helpKey: 'preferences:updatesModeHelp',
                key: 'updates.mode',
                labelKey: 'preferences:updatesMode',
                scope: 'app',
                section: 'updates',
                type: 'select',
                values: ['auto', 'notify', 'manual'],
            },
            {
                defaultValue: 'stable',
                helpKey: 'preferences:updatesChannelHelp',
                key: 'updates.channel',
                labelKey: 'preferences:updatesChannel',
                scope: 'app',
                section: 'updates',
                type: 'select',
                values: ['stable', 'beta'],
            },
        ]);
    });

    it('prefers workspace values over repo and app values', () => {
        const app: PreferenceValues = {
            'appearance.language': 'en',
            'appearance.themeManual': 'light',
        };
        const repo: PreferenceValues = {
            'appearance.language': 'es',
            'appearance.themeManual': 'dark',
        };
        const workspace: PreferenceValues = { 'appearance.language': 'en' };

        expect(resolvePreferenceValues({ app, repo, workspace })).toEqual({
            'appearance.language': 'en',
            'appearance.themeMode': 'system',
            'appearance.themeDay': 'light',
            'appearance.themeNight': 'dark',
            'appearance.themeManual': 'dark',
            'updates.mode': 'auto',
            'updates.channel': 'stable',
        });
    });

    it('uses defaults when persisted values are invalid', () => {
        expect(
            resolvePreferenceValues({
                app: { 'appearance.language': 42, 'appearance.themeMode': 'high-contrast' },
            }),
        ).toEqual({
            'appearance.language': 'en',
            'appearance.themeMode': 'system',
            'appearance.themeDay': 'light',
            'appearance.themeNight': 'dark',
            'appearance.themeManual': 'light',
            'updates.mode': 'auto',
            'updates.channel': 'stable',
        });
    });

    it('names the four themes the three choices of a theme draw from', () => {
        expect(THEME_IDS).toEqual(['light', 'light-contrast', 'dark', 'dark-contrast']);
    });
});
