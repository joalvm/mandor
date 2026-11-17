import { SettingsSection } from '@mandor/prefs';

import { ConnectionDefaultsSection } from './components/dialog/ConnectionDefaultsSection.js';

/** The section of the settings of the app that holds the defaults of the connections. */
export const CONNECTION_DEFAULTS_SECTION = 'connections';

/** Hangs the defaults of the connections in the settings of the app, beside its own sections. */
export function ConnectionDefaultsSettings() {
    return (
        <SettingsSection
            icon="connection"
            id={CONNECTION_DEFAULTS_SECTION}
            titleKey="connections:defaultsTitle"
        >
            <ConnectionDefaultsSection />
        </SettingsSection>
    );
}
