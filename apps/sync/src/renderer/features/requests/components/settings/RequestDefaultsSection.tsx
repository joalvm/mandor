import { useMessages } from '@mandor/i18n';
import { defaultsEditing } from '@mandor/ui';
import { useStore } from 'zustand';

import { requestDefaultsStore } from '../../request-defaults-store.js';
import { RequestRedirectSettings } from './RequestRedirectSettings.js';
import { RequestSendingSettings } from './RequestSendingSettings.js';
import { RequestTlsSettings } from './RequestTlsSettings.js';

/**
 * The defaults of the requests, in the settings of the app: the same rows a request draws, with
 * nothing above them to inherit from. A change here reaches every request that left the row
 * alone, at its next send.
 */
export function RequestDefaultsSection() {
    const labels = useMessages('requests');
    const defaults = useStore(requestDefaultsStore, (state) => state.defaults);
    const setDefaults = useStore(requestDefaultsStore, (state) => state.setDefaults);
    const editing = defaultsEditing(defaults, setDefaults);

    return (
        <div className="flex min-h-0 min-w-0 flex-col gap-gap-section" data-part="request-defaults">
            <p className="px-pad-control text-xs text-text-secondary">{labels('defaultsHelp')}</p>
            <RequestSendingSettings editing={editing} />
            <RequestRedirectSettings editing={editing} />
            <RequestTlsSettings editing={editing} />
        </div>
    );
}
