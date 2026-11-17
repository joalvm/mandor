import type { createPlainI18n } from '@mandor/i18n';
import type { UpdatePhase, UpdateState } from '@mandor/ipc';
import type { MenuItemConstructorOptions } from 'electron';

type Translate = ReturnType<typeof createPlainI18n>['t'];

/** What the menu can ask of the updates. The release notes are the page of the app. */
type UpdateMenuAction = 'check' | 'download' | 'install' | 'openPage';

/** The updates as the menu sees them: what is true now, and how to ask for something. */
export type UpdateMenu = {
    state: UpdateState;
    run: (action: UpdateMenuAction) => void;
};

/**
 * The part of the state the entries of the menu depend on. A download reports its progress many
 * times a second and no label shows it, so the menu is rebuilt only when this changes.
 */
export function updateMenuKey(menu: UpdateMenu | undefined): string {
    if (menu === undefined) {
        return '';
    }

    const { phase, support, next } = menu.state;

    return `${phase}|${support}|${next?.version ?? ''}`;
}

/**
 * The entries of Help: the one that follows the update, like the editors people already know
 * (look → download → restart), and the release notes, which are the page of the app. An install
 * that cannot update from the app has no entry that pretends it can.
 */
export function helpEntries(
    t: Translate,
    menu: UpdateMenu | undefined,
): MenuItemConstructorOptions[] {
    const notes: MenuItemConstructorOptions = {
        click: () => {
            menu?.run('openPage');
        },
        enabled: menu !== undefined,
        label: t('releaseNotes'),
    };

    if (menu === undefined || menu.state.support === 'unsupported') {
        return [notes];
    }

    return [updateEntry(t, menu), notes];
}

type UpdateEntry = (t: Translate, menu: UpdateMenu) => MenuItemConstructorOptions;

function act(menu: UpdateMenu, action: UpdateMenuAction): () => void {
    return () => {
        menu.run(action);
    };
}

/** A version found: an install that updates itself downloads it, any other opens its page. */
function availableEntry(t: Translate, menu: UpdateMenu): MenuItemConstructorOptions {
    const version = menu.state.next?.version ?? '';

    if (menu.state.support === 'full') {
        return { click: act(menu, 'download'), label: t('downloadUpdate', { version }) };
    }

    return { click: act(menu, 'openPage'), label: t('getUpdate', { version }) };
}

function checkEntry(t: Translate, menu: UpdateMenu): MenuItemConstructorOptions {
    return { click: act(menu, 'check'), label: t('checkForUpdates') };
}

/** The entry of each phase: shut while the updater works, an offer once it has something. */
const ENTRY_OF_PHASE: Readonly<Record<UpdatePhase, UpdateEntry>> = {
    available: availableEntry,
    checking: (t) => ({ enabled: false, label: t('checkingForUpdates') }),
    downloading: (t) => ({ enabled: false, label: t('downloadingUpdate') }),
    error: checkEntry,
    idle: checkEntry,
    ready: (t, menu) => ({ click: act(menu, 'install'), label: t('restartToUpdate') }),
};

function updateEntry(t: Translate, menu: UpdateMenu): MenuItemConstructorOptions {
    return ENTRY_OF_PHASE[menu.state.phase](t, menu);
}
