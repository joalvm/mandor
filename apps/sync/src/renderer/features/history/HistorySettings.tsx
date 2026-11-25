import { PreferenceRows, SettingsSection } from '@mandor/prefs';

import { useHistoryRetention } from './hooks/useHistoryRetention.js';

/** The section of the settings of the app that holds how much of the history is kept. */
export const HISTORY_SETTINGS_SECTION = 'history';

/**
 * Hands main what the settings keep. Apart from the section, so a change of the setting does
 * not declare the section again.
 */
function AppliedHistoryRetention() {
    useHistoryRetention();

    return null;
}

/** Hangs how much of the history is kept in the settings of the app, and hands it to main. */
export function HistorySettings() {
    return (
        <>
            <AppliedHistoryRetention />
            <SettingsSection
                icon="history"
                id={HISTORY_SETTINGS_SECTION}
                titleKey="preferences:section-history"
            >
                <PreferenceRows section="history" titleKey="preferences:historyGroup" />
            </SettingsSection>
        </>
    );
}
