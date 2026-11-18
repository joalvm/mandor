import { SettingsSection } from '@mandor/prefs';

import { RequestDefaultsSection } from './components/settings/RequestDefaultsSection.js';

/** The section of the settings of the app that holds the defaults of the requests. */
export const REQUEST_DEFAULTS_SECTION = 'requests';

/** Hangs the defaults of the requests in the settings of the app, beside its own sections. */
export function RequestDefaultsSettings() {
    return (
        <SettingsSection
            icon="send"
            id={REQUEST_DEFAULTS_SECTION}
            titleKey="requests:defaultsTitle"
        >
            <RequestDefaultsSection />
        </SettingsSection>
    );
}
