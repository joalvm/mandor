import type { FolderSetting, InteropFormat, StorableKind } from '@mandor/interop-core';
import type { WorkspaceKind } from '@mandor/schema';

import { registerAboutHandlers, type AboutHandlerDeps } from '../about/about.handlers.js';
import {
    registerAppearanceHandlers,
    type AppearanceHandlerDeps,
} from '../window/appearance.handlers.js';
import { registerCollectionHandlers } from '../collection/collection.handlers.js';
import { registerFolderSettingsHandlers } from '../collection/folder-settings.handlers.js';
import { registerGlobalsHandlers } from '../globals/globals.handlers.js';
import { registerDefaultEnvironmentHandlers } from '../environment/default-environment.handlers.js';
import { registerAuthHandlers } from '../auth/auth.handlers.js';
import { registerAuthTokenHandlers } from '../auth/auth-token.handlers.js';
import { registerConflictHandlers } from '../conflict/conflict.handlers.js';
import { registerDocHandlers } from '../doc/doc.handlers.js';
import { registerEnvironmentHandlers } from '../environment/environment.handlers.js';
import { registerImportHandlers } from '../import/import.handlers.js';
import { readerInWorker } from '../import/read-in-worker.js';
import { systemOpenDialog } from '../import/system-open-dialog.js';
import { registerExportHandlers } from '../export/export.handlers.js';
import { systemSaveDialog } from '../export/system-save-dialog.js';
import { systemSaveFolder } from '../export/system-save-folder.js';
import { openFiltersOf, saveFiltersOf } from '../interop/format-filters.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { loggedIpc } from '../ipc/logged-ipc.js';
import { redactedIpc } from '../ipc/redacted-ipc.js';
import type { PushTarget } from '../ipc/push-to-window.js';
import type { Logger } from '../log/create-logger.js';
import { logCommitFailures } from '../repo/log-commit-failures.js';
import { logConflictRecords } from '../repo/log-conflict-records.js';
import type { AppMenuHolder } from '../menu/app-menu-holder.js';
import { registerMenuHandlers } from '../menu/menu.handlers.js';
import { registerWindowLogHandlers } from '../log/window-log.handlers.js';
import { registerNetworkHandlers } from '../network/network.handlers.js';
import { registerScriptsHandlers, type RunScripts } from '../script/scripts.handlers.js';
import { createScriptVariables, type ScriptVariables } from '../script/script-variables.js';
import { systemChooseNetworkFile } from '../network/system-choose-network-file.js';
import { systemNetworkFor } from '../network/system-network-for.js';
import { registerNoticeHandlers } from '../notice/notice.handlers.js';
import type { NoticeOutbox } from '../notice/raise-notice.js';
import { registerUpdateHandlers, type UpdateHandlerDeps } from '../update/update.handlers.js';
import { registerOriginHandlers } from '../origin/origin.handlers.js';
import { registerSecretHandlers } from '../secret/secret.handlers.js';
import { registerSessionHandlers } from '../session/session.handlers.js';
import { type WatchableWindow, watchMaximizedEvents } from '../window/maximized-events.js';
import { registerWindowHandlers } from '../window/window.handlers.js';
import { windowOf, type SenderWindow } from '../window/window-of.js';
import {
    registerWorkspaceHandlers,
    type WorkspaceHandlerDeps,
} from '../workspace/workspace.handlers.js';
import { relaunchApp } from './relaunch-app.js';
import { logWindowReady, type StartupTimeline } from './startup-timeline.js';

/** Everything the handlers of main need that the app decides or the runtime found out. */
export type HandlerDeps = {
    kind: WorkspaceKind;
    userDataDir: string;
    logger: Logger;
    /**
     * The window the app opened, as exactly what the handlers use: a target for pushes and a
     * watcher of its maximized state. Named structurally, like every other window here, so a
     * node test can stand in for it without Electron.
     */
    window: PushTarget & WatchableWindow;
    /** The one outbox of this window: what main says without being asked goes through it. */
    notices: NoticeOutbox;
    /** What finds and installs updates, and the page to send the installs that cannot update by themselves. */
    update: Pick<
        UpdateHandlerDeps,
        'port' | 'support' | 'homepage' | 'openExternal' | 'settle' | 'schedule'
    >;
    /** Who the app is and where its licenses are, as the process reports them. */
    about: AboutHandlerDeps;
    /** The system the colour scheme of the window is handed to. */
    appearance: AppearanceHandlerDeps;
    /** The options menu, installed by the runtime before the window exists. */
    holder: AppMenuHolder<SenderWindow>;
    /** The marks of this start, which the window completes by saying it is ready. */
    timeline: StartupTimeline;
    /** The channels this app answers and the other does not, registered after the common ones. */
    handlers: readonly AppHandlers[];
    /** The documents this app imports and exports. The host names none of them. */
    formats: readonly InteropFormat[];
    /** The bundle every import reads its files in: a worker that a document cannot stop. */
    importWorker: string;
    /** What this machine approved, whether scripts run at all, and the workers they run in. */
    scripts: RunScripts;
    /** The kinds of leaf this app keeps; an import leaves out the others with their reason. */
    stores: readonly StorableKind[];
    /** What this app keeps of a collection or a folder; an import leaves out the others. */
    folderSettings: readonly FolderSetting[];
} & Pick<WorkspaceHandlerDeps, 'forgetWorkspace'>;

/** What main knows once the window exists, handed to the handlers an app brings of its own. */
export type AppHandlerContext = Pick<
    HandlerDeps,
    'window' | 'userDataDir' | 'logger' | 'scripts'
> & {
    /** How a module of the app tells the person something; the one outbox of this window. */
    notices: NoticeOutbox;
    /** What scripts set, the same values the window clears: one for the handlers of this window. */
    scriptVariables: ScriptVariables;
};

/**
 * The handlers one app registers on top of the common ones, and their disposers in the order
 * they were made. The host names none of them: what only one app answers is that app's code.
 */
export type AppHandlers = (ipc: HandlerIpc, context: AppHandlerContext) => (() => void)[];

/**
 * Every channel main answers, registered in one place, and the disposer of each one in the
 * order they were created: first the channels both apps answer, then the ones the app brought.
 * Which channels exist is decided by that list, never by the host asking which app it is.
 */
export function registerHandlers(bare: HandlerIpc, deps: HandlerDeps): (() => void)[] {
    // Redaction is the outer layer: what leaves is redacted, and what the log writes redacts itself.
    const ipc = redactedIpc(loggedIpc(bare, deps.logger));
    const { notices } = deps;
    const scriptVariables = createScriptVariables();
    const context = {
        window: deps.window,
        userDataDir: deps.userDataDir,
        logger: deps.logger,
        scripts: deps.scripts,
        notices,
        scriptVariables,
    };

    return [
        registerOriginHandlers(ipc, {
            kind: deps.kind,
            userDataDir: deps.userDataDir,
            notices,
            logger: deps.logger,
        }),
        registerWorkspaceHandlers(ipc, { kind: deps.kind, forgetWorkspace: deps.forgetWorkspace }),
        registerAuthHandlers(ipc),
        registerFolderSettingsHandlers(ipc),
        registerGlobalsHandlers(ipc, { userDataDir: deps.userDataDir }),
        registerDefaultEnvironmentHandlers(ipc),
        registerAuthTokenHandlers(ipc, {
            userDataDir: deps.userDataDir,
            networkFor: systemNetworkFor(deps.userDataDir),
        }),
        registerCollectionHandlers(ipc, { notices, logger: deps.logger }),
        registerImportHandlers(ipc, {
            chooseDocument: systemOpenDialog(openFiltersOf(deps.formats)),
            formats: deps.formats,
            readImport: readerInWorker(deps.importWorker),
            stores: deps.stores,
            folderSettings: deps.folderSettings,
            kind: deps.kind,
            userDataDir: deps.userDataDir,
            target: deps.window,
        }),
        registerDocHandlers(ipc),
        registerConflictHandlers(ipc),
        registerNoticeHandlers(ipc, notices),
        registerUpdateHandlers(ipc, {
            ...deps.update,
            announce: (menu) => {
                deps.holder.updates(menu);
            },
            outbox: notices,
            target: deps.window,
            logger: deps.logger,
        }),
        registerWindowLogHandlers(ipc, { logger: deps.logger }),
        registerEnvironmentHandlers(ipc, {
            userDataDir: deps.userDataDir,
            notices,
            logger: deps.logger,
        }),
        registerExportHandlers(ipc, {
            chooseSavePath: systemSaveDialog((name) => saveFiltersOf(deps.formats, name)),
            chooseSaveFolder: systemSaveFolder(),
            formats: deps.formats,
        }),
        registerSecretHandlers(ipc, { userDataDir: deps.userDataDir, logger: deps.logger }),
        registerNetworkHandlers(ipc, {
            userDataDir: deps.userDataDir,
            chooseFile: systemChooseNetworkFile,
        }),
        registerScriptsHandlers(ipc, { ...deps.scripts, variables: scriptVariables }),
        registerSessionHandlers(ipc),
        registerAboutHandlers(ipc, deps.about),
        registerAppearanceHandlers(ipc, deps.appearance),
        registerMenuHandlers(ipc, { holder: deps.holder }),
        registerWindowHandlers(ipc, {
            window: deps.window,
            windowOf,
            holder: deps.holder,
            relaunch: relaunchApp,
            onReady: () => {
                logWindowReady(deps.timeline, deps.logger);
                deps.update.schedule.ready();
            },
            watchMaximized: (notify) => {
                watchMaximizedEvents(deps.window, notify);
            },
        }),
        // Not a channel, but the same lifetime: it listens for as long as the handlers answer.
        logCommitFailures(deps.logger),
        logConflictRecords(deps.logger),
        ...deps.handlers.flatMap((register) => register(ipc, context)),
    ];
}
