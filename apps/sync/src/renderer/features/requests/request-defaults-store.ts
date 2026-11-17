import {
    DEFAULT_REQUEST_SETTINGS,
    effectiveRequestSettings,
    requestSettingsSchema,
    type RequestSettings,
} from '@mandor/schema';
import { createStore } from 'zustand/vanilla';

/** Where the defaults of the requests live: this app's own, beside its preferences. */
export const REQUEST_DEFAULTS_STORAGE_KEY = 'mandor.sync.requestDefaults';

type RequestDefaultsState = {
    defaults: RequestSettings;
};

type RequestDefaultsActions = {
    setDefaults: (defaults: RequestSettings) => void;
};

/**
 * What was kept, read as overrides over the factory: a setting a later version adds takes its
 * factory value, and one that no longer reads is dropped instead of breaking the whole block.
 */
export function readRequestDefaults(): RequestSettings {
    try {
        const stored = window.localStorage.getItem(REQUEST_DEFAULTS_STORAGE_KEY);
        const parsed = requestSettingsSchema.safeParse(
            stored === null ? {} : (JSON.parse(stored) as unknown),
        );

        return effectiveRequestSettings(parsed.success ? parsed.data : {});
    } catch {
        return DEFAULT_REQUEST_SETTINGS;
    }
}

function writeRequestDefaults(defaults: RequestSettings): void {
    try {
        window.localStorage.setItem(REQUEST_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
    } catch {
        // A storage that refuses keeps the defaults for this run: the send still uses them.
    }
}

// store-scope: window — the defaults are the app's: every origin and workspace sends with them.
export const requestDefaultsStore = createStore<RequestDefaultsActions & RequestDefaultsState>()(
    (set) => ({
        defaults: readRequestDefaults(),
        setDefaults: (defaults) => {
            writeRequestDefaults(defaults);
            set({ defaults });
        },
    }),
);
