import { useTranslator } from '@mandor/i18n';
import { Dialog, DialogBody, DialogNav, DialogNavItem, DialogNavList } from '@mandor/ui';
import { useMemo } from 'react';
import { useStore } from 'zustand';

import { settingsDialogStore, type SettingsSectionEntry } from '../../settings-dialog-store.js';
import { CertificateSettings } from '../network/CertificateSettings.js';
import { ProxySettings } from '../network/ProxySettings.js';
import { ThemesSection } from '../themes/ThemesSection.js';
import { AboutSection } from './AboutSection.js';
import { ForgetApprovalsRow } from './ForgetApprovalsRow.js';
import { PreferenceRows } from './PreferenceRows.js';
import { RunScriptsRow } from './RunScriptsRow.js';
import { ShortcutsList } from './ShortcutsList.js';
import { UpdatesRow } from './UpdatesRow.js';

/**
 * What every app opens with, before what it adds: the language, which is the first thing a
 * reader of the settings looks for, and how the window looks.
 */
const LEADING: readonly SettingsSectionEntry[] = [
    {
        icon: 'settings',
        id: 'general',
        content: <PreferenceRows section="general" titleKey="preferences:language" />,
        titleKey: 'preferences:section-general',
    },
    {
        icon: 'color-mode',
        id: 'themes',
        content: <ThemesSection />,
        titleKey: 'preferences:section-themes',
    },
];

/**
 * What closes the column, after the sections an app adds: whether scripts run on this machine and
 * what it approved, how requests reach the network — the
 * proxy and the certificates are of this machine, not of one app — how the app updates, the keys,
 * which are read and not set, and which app this is.
 */
const TRAILING: readonly SettingsSectionEntry[] = [
    {
        icon: 'code',
        id: 'scripts',
        content: (
            <PreferenceRows section="scripts" titleKey="preferences:scriptsGroup">
                <RunScriptsRow />
                <ForgetApprovalsRow />
            </PreferenceRows>
        ),
        titleKey: 'preferences:section-scripts',
    },
    {
        icon: 'globe',
        id: 'proxy',
        content: <ProxySettings />,
        titleKey: 'preferences:section-proxy',
    },
    {
        icon: 'key',
        id: 'certificates',
        content: <CertificateSettings />,
        titleKey: 'preferences:section-certificates',
    },
    {
        icon: 'refresh',
        id: 'updates',
        content: (
            <PreferenceRows section="updates" titleKey="preferences:updatesGroup">
                <UpdatesRow />
            </PreferenceRows>
        ),
        titleKey: 'preferences:section-updates',
    },
    {
        icon: 'menu',
        id: 'shortcuts',
        content: <ShortcutsList />,
        titleKey: 'preferences:section-shortcuts',
    },
    {
        icon: 'info',
        id: 'about',
        content: <AboutSection />,
        titleKey: 'preferences:section-about',
    },
];

/**
 * The settings of the app, in master and detail: the sections on the left, the one being read
 * on the right. Opening it is a surface of the window, so the title bar and the palette open it
 * alike; the sections an app adds take their place between its own and the network.
 */
export function SettingsDialog() {
    const translate = useTranslator();
    const open = useStore(settingsDialogStore, (state) => state.open);
    const chosen = useStore(settingsDialogStore, (state) => state.section);
    const added = useStore(settingsDialogStore, (state) => state.sections);
    const sections = useMemo(() => [...LEADING, ...added, ...TRAILING], [added]);
    const section = sections.find((entry) => entry.id === chosen) ?? LEADING[0];

    return (
        // modal-policy: short-config-form
        <Dialog
            closeLabel={translate('preferences:close')}
            onOpenChange={(next) => {
                if (!next) {
                    settingsDialogStore.getState().close();
                }
            }}
            open={open}
            title={section === undefined ? '' : translate(section.titleKey)}
        >
            <DialogNav>
                <DialogNavList label={translate('preferences:sections')}>
                    {sections.map((entry) => (
                        <DialogNavItem
                            icon={entry.icon}
                            key={entry.id}
                            label={translate(entry.titleKey)}
                            onSelect={() => {
                                settingsDialogStore.getState().choose(entry.id);
                            }}
                            selected={entry.id === section?.id}
                        />
                    ))}
                </DialogNavList>
            </DialogNav>
            <DialogBody>
                <div className="flex min-w-0 flex-col gap-gap-group" data-part="app-settings">
                    {section?.content}
                </div>
            </DialogBody>
        </Dialog>
    );
}
