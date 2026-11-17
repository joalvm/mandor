import { useLayoutEffect, type PropsWithChildren } from 'react';

import { settingsDialogStore, type SettingsSectionEntry } from '../../settings-dialog-store.js';

/** The children are what the dialog shows while the section is chosen. */
type SettingsSectionProps = PropsWithChildren<Omit<SettingsSectionEntry, 'content'>>;

/**
 * Adds a section to the settings of the app while it is mounted. The settings belong to the
 * app, so each app writes what only it has — the defaults of its requests, of its connections —
 * and the dialog lays it out among its own.
 */
export function SettingsSection({ children, icon, id, titleKey }: SettingsSectionProps) {
    useLayoutEffect(
        () => settingsDialogStore.getState().register({ content: children, icon, id, titleKey }),
        [children, icon, id, titleKey],
    );

    return null;
}
