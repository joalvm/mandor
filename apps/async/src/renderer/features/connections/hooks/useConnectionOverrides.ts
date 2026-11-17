import { useSettingsInheritance } from '@mandor/prefs';
import { overridesEditing, type SettingOverrides, type SettingsEditing } from '@mandor/ui';
import { useStore } from 'zustand';

import { connectionDefaultsStore } from '../connection-defaults-store.js';
import type { ConnectionDefaults } from '../lib/connection-settings.js';
import { CONNECTION_DEFAULTS_SECTION } from '../ConnectionDefaultsSettings.js';

/**
 * One group of a connection's settings over the defaults of the app: the rows show what the
 * connection dials with, and a change keeps only what the connection decided. The overrides
 * may carry more of the group than the defaults hold — a frame, the subprotocols — and they
 * ride through every write untouched.
 */
export function useConnectionOverrides<Group extends keyof ConnectionDefaults>(
    group: Group,
    overrides: SettingOverrides<ConnectionDefaults[Group]>,
    onOverrides: (overrides: SettingOverrides<ConnectionDefaults[Group]>) => void,
): SettingsEditing<ConnectionDefaults[Group]> {
    const words = useSettingsInheritance(CONNECTION_DEFAULTS_SECTION);
    const defaults = useStore(connectionDefaultsStore, (state) => state.defaults[group]);

    return overridesEditing({ defaults, onOverrides, overrides, words });
}
