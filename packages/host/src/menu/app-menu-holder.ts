import { DEFAULT_LANGUAGE, type Language } from '@mandor/i18n';
import type { WorkspaceKind } from '@mandor/schema';
import type { MenuItemConstructorOptions } from 'electron';

import type { OpenedMenu } from './install-app-menu.js';
import { updateMenuKey, type UpdateMenu } from './update-menu.js';

/** What the holder is made of; `W` is the window its menu opens under. */
export type AppMenuHolderDeps<W> = {
    /** Builds the template in the language it is given. It is `buildAppMenu`, wired. */
    build: (language: Language, updates?: UpdateMenu) => MenuItemConstructorOptions[];
    /** Installs a template where the platform shows it, and hands back the built menu. */
    install: (template: MenuItemConstructorOptions[]) => OpenedMenu<W>;
    kind: WorkspaceKind;
};

export type AppMenuHolder<W> = {
    /** The menu the popup button opens: whichever language was spoken last. */
    current: () => OpenedMenu<W>;
    /** The language spoken last: what main says on its own, like a dialog, is said in it. */
    language: () => Language;
    /** Rebuilds and reinstalls the menu in the language of the interface. */
    speak: (language: Language) => void;
    /** Takes what the updates say now, and rebuilds only if an entry of the menu would change. */
    updates: (menu: UpdateMenu) => void;
};

/**
 * Keeps the installed menu alive across language changes. Without it, the handle the popup
 * handler captured at boot would open for the rest of the run in the language of the boot,
 * whatever the window says it is speaking now.
 *
 * The first build runs before the first `await` of the start, so Electron finds a menu and
 * builds none of its own; its language is the provisional English, not a decision — the
 * renderer owns the preference and says so through `menu:language` the moment it is up.
 */
export function createAppMenuHolder<W>(deps: AppMenuHolderDeps<W>): AppMenuHolder<W> {
    let spoken: Language = DEFAULT_LANGUAGE;
    let updating: UpdateMenu | undefined;
    let menu = deps.install(deps.build(spoken));

    return {
        current: () => menu,
        language: () => spoken,
        speak: (language) => {
            spoken = language;
            menu = deps.install(deps.build(language, updating));
        },
        updates: (next) => {
            const changed = updateMenuKey(next) !== updateMenuKey(updating);

            updating = next;

            if (changed) {
                menu = deps.install(deps.build(spoken, updating));
            }
        },
    };
}
