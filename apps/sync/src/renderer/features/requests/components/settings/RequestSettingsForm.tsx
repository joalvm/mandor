import { useSettingsInheritance } from '@mandor/prefs';
import type { RequestSettingsOverrides } from '@mandor/schema';
import { overridesEditing } from '@mandor/ui';
import { useStore } from 'zustand';

import { REQUEST_DEFAULTS_SECTION } from '../../RequestDefaultsSettings.js';
import { requestDefaultsStore } from '../../request-defaults-store.js';
import { RequestRedirectSettings } from './RequestRedirectSettings.js';
import { RequestSendingSettings } from './RequestSendingSettings.js';
import { RequestTlsSettings } from './RequestTlsSettings.js';

type RequestSettingsFormProps = {
    onSettings: (settings: RequestSettingsOverrides) => void;
    settings: RequestSettingsOverrides;
};

/**
 * The settings of one request, over the defaults of the app. Each row shows what the send would
 * use and says whose value it is: the defaults, with the way to them, or the request's own,
 * with the way back. The file keeps only what the request decided, so a turned-off check shows
 * in the diff of the repo and a later change of the defaults reaches every request that left
 * that row alone.
 */
export function RequestSettingsForm({ onSettings, settings }: RequestSettingsFormProps) {
    const words = useSettingsInheritance(REQUEST_DEFAULTS_SECTION);
    const defaults = useStore(requestDefaultsStore, (state) => state.defaults);
    const editing = overridesEditing({
        defaults,
        onOverrides: onSettings,
        overrides: settings,
        words,
    });

    return (
        <div className="flex min-h-0 min-w-0 flex-col gap-gap-section" data-part="request-settings">
            <RequestSendingSettings editing={editing} />
            <RequestRedirectSettings editing={editing} />
            <RequestTlsSettings editing={editing} />
        </div>
    );
}
