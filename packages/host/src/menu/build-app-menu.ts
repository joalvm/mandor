import type { MenuItemConstructorOptions } from 'electron';

import { createPlainI18n, type Language } from '@mandor/i18n';
import { CHANNELS, type Channel, type MenuEditPush } from '@mandor/ipc';

import { pushToWindow, type PushTarget } from '../ipc/push-to-window.js';
import { helpEntries, type UpdateMenu } from './update-menu.js';

const SEPARATOR: MenuItemConstructorOptions = { type: 'separator' };

/** What a click hands back: a window of the app, or one of the windows that shows no page. */
type ClickedWindow = PushTarget | { isDestroyed: () => boolean };

/**
 * The template both platforms share: the app menu on macOS, the popup of the menu button
 * everywhere else. Two shapes of the same menu, never two menus.
 *
 * Every label comes from the app in the language of the interface; the roles only carry the
 * behavior and the accelerator. `File` closes the window, `Edit` is the clipboard and nothing
 * else, `View` owns zoom and the developer tools, and `Window` moves the window.
 *
 * The product submenu exists only where the system draws the menu bar: on macOS it sits at
 * the top of the screen with `About`, `Settings` and `Quit`, and everywhere else the menu button
 * already opens the product's own menu, so repeating the product's name as its first entry would
 * say nothing. Settings and quitting live in the product submenu on macOS and in `File`
 * everywhere else — one way in and one way out, never two.
 *
 * `Help` carries the release notes and the entry that follows the update, which is why the
 * updates arrive as an argument too: the menu is rebuilt when what they say changes.
 *
 * The language arrives as an argument and is never defaulted here. A translator built with no
 * language answers in the default one and looks right to whoever wrote it in that language,
 * so the menu would stay English for a Spanish window and nothing would say so.
 */
export function buildAppMenu(
    productName: string,
    language: Language,
    platform: NodeJS.Platform,
    updates?: UpdateMenu,
): MenuItemConstructorOptions[] {
    const t = createPlainI18n(language).t;
    // macOS quits from the menu named after the app; anywhere else, from the File menu.
    const mac = platform === 'darwin';
    const settings: MenuItemConstructorOptions = {
        accelerator: 'CmdOrCtrl+,',
        click: pushOnClick(CHANNELS.menuSettings, {}),
        label: t('settings'),
        // The window listens for the keys itself, so the menu only shows them: registered too,
        // one press would open the dialog twice.
        registerAccelerator: false,
    };
    const productMenu: MenuItemConstructorOptions[] = mac
        ? [
              {
                  label: productName,
                  submenu: [
                      { label: t('aboutApp', { name: productName }), role: 'about' },
                      SEPARATOR,
                      settings,
                      SEPARATOR,
                      { label: t('quit'), role: 'quit' },
                  ],
              },
          ]
        : [];
    const settingsAndQuitInFile: MenuItemConstructorOptions[] = mac
        ? []
        : [SEPARATOR, settings, SEPARATOR, { label: t('quit'), role: 'quit' }];

    return [
        ...productMenu,
        {
            label: t('file'),
            submenu: [{ label: t('closeWindow'), role: 'close' }, ...settingsAndQuitInFile],
        },
        {
            label: t('edit'),
            submenu: [
                { accelerator: 'CmdOrCtrl+Z', click: editStep('undo'), label: t('undo') },
                {
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    click: editStep('redo'),
                    label: t('redo'),
                },
                SEPARATOR,
                { label: t('cut'), role: 'cut' },
                { label: t('copy'), role: 'copy' },
                { label: t('paste'), role: 'paste' },
                { label: t('selectAll'), role: 'selectAll' },
            ],
        },
        {
            label: t('view'),
            submenu: [
                { label: t('reload'), role: 'reload' },
                SEPARATOR,
                { label: t('resetZoom'), role: 'resetZoom' },
                { label: t('zoomIn'), role: 'zoomIn' },
                { label: t('zoomOut'), role: 'zoomOut' },
                SEPARATOR,
                { label: t('toggleDevTools'), role: 'toggleDevTools' },
            ],
        },
        {
            label: t('window'),
            submenu: [
                { label: t('minimize'), role: 'minimize' },
                { label: t('maximize'), click: maximize },
            ],
        },
        { label: t('help'), submenu: helpEntries(t, updates) },
    ];
}

/**
 * The step of the history handed to the window that was focused when the menu was clicked. The
 * roles of the menu run the browser's own undo over the field that holds the caret, and an
 * editor keeps the history of its document in the renderer, where that undo cannot reach it —
 * it holds a few lines around the caret and none of the steps that got there.
 */
function editStep(step: MenuEditPush['step']) {
    return pushOnClick(CHANNELS.menuEdit, { step });
}

/** What a click on an entry that is the window's to answer sends it: a window, or nothing at all. */
function pushOnClick(channel: Channel, message: unknown) {
    return (_item: unknown, window: ClickedWindow | undefined): void => {
        if (window === undefined || !('webContents' in window)) {
            return;
        }

        pushToWindow(window, channel, message);
    };
}

/**
 * One direction or the other, decided by the focused window at the moment of the click. There
 * is no role for it, so the window the menu hands back is the one that acts.
 */
function maximize(
    _item: unknown,
    window:
        { isMaximized: () => boolean; unmaximize: () => void; maximize: () => void } | undefined,
): void {
    if (window === undefined) {
        return;
    }

    if (window.isMaximized()) {
        window.unmaximize();

        return;
    }

    window.maximize();
}
