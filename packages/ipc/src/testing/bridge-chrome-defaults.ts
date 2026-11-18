import type { CoreBridge } from '../bridge/core-bridge.js';
import type { RepoArea } from '../bridge/repo-area.js';
import type { ConflictRecordedPush, RepoChangedPush } from '../repo/repo-changed.js';
import type { MenuEditPush } from '../menu/menu-edit.js';
import { success } from '../result/success.js';
import type { WindowMaximizedPush } from '../window/window-maximized.js';

/** Who hears a step of the Edit menu, and who hears the window change its size. */
export type EditStepHandler = (push: MenuEditPush) => void;
export type MaximizedHandler = (push: WindowMaximizedPush) => void;

/** Who hears the Settings entry of the menu being clicked. */
export type MenuSettingsHandler = () => void;

export function defaultMenu(
    editStepHandlers: Set<EditStepHandler>,
    settingsHandlers: Set<MenuSettingsHandler>,
): CoreBridge['menu'] {
    return {
        speak: () => Promise.resolve(success({})),
        onEditStep: (handler) => {
            editStepHandlers.add(handler);

            return () => editStepHandlers.delete(handler);
        },
        onSettings: (handler) => {
            settingsHandlers.add(handler);

            return () => settingsHandlers.delete(handler);
        },
    };
}

export function defaultWindow(maximizedHandlers: Set<MaximizedHandler>): CoreBridge['window'] {
    return {
        minimize: () => Promise.resolve(success({})),
        toggleMaximize: () => Promise.resolve(success({})),
        close: () => Promise.resolve(success({})),
        onMaximizedChange: (handler) => {
            maximizedHandlers.add(handler);

            return () => maximizedHandlers.delete(handler);
        },
        popupAppMenu: () => Promise.resolve(success({})),
        relaunch: () => Promise.resolve(success({})),
        ready: () => Promise.resolve(success({})),
    };
}

/** Who hears the files of the repo change under the window, and who hears a clash kept. */
export type RepoChangedHandler = (push: RepoChangedPush) => void;
export type ConflictRecordedHandler = (push: ConflictRecordedPush) => void;

export function defaultRepo(
    changedHandlers: Set<RepoChangedHandler>,
    conflictHandlers: Set<ConflictRecordedHandler>,
): RepoArea {
    return {
        onChanged: (handler) => {
            changedHandlers.add(handler);

            return () => changedHandlers.delete(handler);
        },
        onConflictRecorded: (handler) => {
            conflictHandlers.add(handler);

            return () => conflictHandlers.delete(handler);
        },
    };
}
