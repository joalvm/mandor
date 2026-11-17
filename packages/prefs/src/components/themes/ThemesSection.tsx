import { useTranslator } from '@mandor/i18n';
import { Select, SettingRow, SettingsGroup } from '@mandor/ui';

import { usePreferences } from '../../preferences-context.js';
import { THEME_MODES, themeChoiceOf, type ThemeMode } from '../../theme/resolve-theme.js';
import { ThemeCard, type ThemeSlot } from './ThemeCard.js';

/** The cards each mode lays out: the system picks between two, a held theme is only one. */
const CARDS: Record<ThemeMode, readonly ThemeSlot[]> = {
    manual: ['manual'],
    system: ['day', 'night'],
};

/**
 * The themes of the window: whether the system or the reader picks, and the theme for each place
 * that is picked for, every one with its miniature. A theme changes colour and contrast and
 * nothing else, which the section says before it asks for anything.
 */
export function ThemesSection() {
    const translate = useTranslator();
    const preferences = usePreferences();
    const { mode } = themeChoiceOf(preferences.values);

    return (
        <div className="flex flex-col gap-gap-section" data-part="themes-section">
            <p className="px-pad-control text-sm text-text-secondary">
                {translate('preferences:themesIntro')}
            </p>
            <SettingsGroup title={translate('preferences:themesGroup')}>
                <SettingRow
                    help={translate('preferences:themeModeHelp')}
                    label={translate('preferences:themeMode')}
                >
                    <Select
                        label={translate('preferences:themeMode')}
                        onValueChange={(next) => {
                            preferences.writePreference('appearance.themeMode', next);
                        }}
                        options={THEME_MODES.map((each) => ({
                            label: translate(`preferences:appearance-themeMode-${each}`),
                            value: each,
                        }))}
                        value={mode}
                    />
                </SettingRow>
            </SettingsGroup>
            <div className="flex items-stretch gap-gap-group" data-part="theme-cards">
                {CARDS[mode].map((slot) => (
                    <ThemeCard key={slot} slot={slot} />
                ))}
            </div>
        </div>
    );
}
