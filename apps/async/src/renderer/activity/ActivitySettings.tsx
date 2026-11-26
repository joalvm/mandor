import { PreferenceRows, SettingsSection } from '@mandor/prefs';

import { useAppliedActivityKept } from './hooks/useAppliedActivityKept.js';

/** The section of the settings of the app that holds how much activity a connection keeps. */
const ACTIVITY_SETTINGS_SECTION = 'activity';

/**
 * Applies the chosen count to the timelines. Apart from the section, so a change of the setting
 * does not declare the section again.
 */
function AppliedActivityKept() {
    useAppliedActivityKept();

    return null;
}

/** Hangs how much activity each connection keeps in the settings of the app, and applies it. */
export function ActivitySettings() {
    return (
        <>
            <AppliedActivityKept />
            <SettingsSection
                icon="pulse"
                id={ACTIVITY_SETTINGS_SECTION}
                titleKey="preferences:section-activity"
            >
                <PreferenceRows section="activity" titleKey="preferences:activityGroup" />
            </SettingsSection>
        </>
    );
}
