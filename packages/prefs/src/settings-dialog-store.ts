import type { IconName } from '@mandor/ui';
import type { ReactNode } from 'react';
import { createStore } from 'zustand/vanilla';

/**
 * A section of the settings of the app: its place in the column, its name and what it draws.
 * The settings belong to the app, so each app adds what only it has — the defaults of its
 * requests, of its connections — and the dialog lays it out among its own.
 */
export type SettingsSectionEntry = {
    /** What the dialog shows while the section is chosen. */
    content: ReactNode;
    icon: IconName;
    id: string;
    /** The message that names it, translated when drawn so a change of language renames it. */
    titleKey: string;
};

/** The section the dialog opens at when nobody names one. */
const FIRST_SETTINGS_SECTION = 'general';

type SettingsDialogState = {
    open: boolean;
    section: string;
    /** What the apps added, in the order they added it. */
    sections: readonly SettingsSectionEntry[];
};

type SettingsDialogActions = {
    choose: (section: string) => void;
    close: () => void;
    openAt: (section: string | undefined) => void;
    register: (entry: SettingsSectionEntry) => () => void;
};

// store-scope: window — the settings are the app's: a switch of origin neither closes nor changes them.
export const settingsDialogStore = createStore<SettingsDialogActions & SettingsDialogState>()(
    (set, get) => ({
        open: false,
        section: FIRST_SETTINGS_SECTION,
        sections: [],
        choose: (section) => {
            set({ section });
        },
        close: () => {
            set({ open: false });
        },
        openAt: (section) => {
            set({ open: true, section: section ?? get().section });
        },
        register: (entry) => {
            set({ sections: [...get().sections.filter((each) => each.id !== entry.id), entry] });

            return () => {
                set({ sections: get().sections.filter((each) => each !== entry) });
            };
        },
    }),
);

/**
 * Opens the settings of the app at a section, or where they were left when nobody names one: a
 * reader who went back to a section to change it again does not walk down to it twice. Open
 * already, goes there.
 */
export function openSettings(section?: string): void {
    settingsDialogStore.getState().openAt(section);
}
