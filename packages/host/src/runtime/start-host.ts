import { join } from 'node:path';

import { app, ipcMain, protocol } from 'electron';

import type { WorkspaceKind } from '@mandor/schema';

import { electronAboutDeps } from '../about/electron-about-deps.js';
import { electronAppearanceDeps } from '../window/electron-appearance-deps.js';
import { trustedSenderIpc } from '../ipc/trusted-sender-ipc.js';
import { createLogger, type Logger } from '../log/create-logger.js';
import { logLevelOf } from '../log/log-level.js';
import { createNoticeOutbox } from '../notice/raise-notice.js';
import { openLocalOrigin } from '../origin/open-local-origin.js';
import { bindRuntimeWindow, closeOriginRuntime, requestSync } from '../origin/origin-runtime.js';
import { noticeMissingKeychain } from '../origin/system-keychain.js';
import { openScripts } from '../script/scripts.handlers.js';
import { appLayout, type AppLayout } from './app-layout.js';
import { holdQuitForSession } from './hold-quit-for-session.js';
import { once } from './once.js';
import { createOneSession, type OneSession } from './one-session.js';
import { registerHandlers, type HandlerDeps } from './register-handlers.js';
import { registerRendererProtocol } from './register-renderer-protocol.js';
import { installDevTools } from '../devtools/install-devtools.js';
import { bindDialogParent } from '../dialogs/modal-dialog.js';
import { buildAppMenu } from '../menu/build-app-menu.js';
import { createAppMenuHolder } from '../menu/app-menu-holder.js';
import { electronMenuPort } from '../menu/electron-menu-port.js';
import { installAppMenu } from '../menu/install-app-menu.js';
import { createCspNonce } from '../window/csp-nonce.js';
import {
    createWindow,
    type CreatedWindow,
    type CreateWindowOptions,
} from '../window/create-window.js';
import { watchFocusEvents } from '../window/focus-events.js';
import { focusWindow } from '../window/focus-window.js';
import { nativeAsk } from '../window/native-ask.js';
import { createRendererProtocol, registerRendererScheme } from '../window/renderer-protocol.js';
import { watchWindowFaults } from '../window/window-faults.js';
import { applyChromiumLimits } from './chromium-limits.js';
import { watchProcessFaults } from './process-faults.js';
import { electronUpdateDeps } from '../update/electron-update-deps.js';
import { isInstallRun } from '../update/install-update.js';
import { createStartupTimeline } from './startup-timeline.js';
import { unpackagedVariable } from './unpackaged-variable.js';

/** The variable that decides how much the host writes down. */
const LEVEL_VARIABLE = 'MANDOR_LOG_LEVEL';

/** The variable the development server leaves for main: while it is set, the renderer is its. */
const DEV_SERVER_VARIABLE = 'ELECTRON_RENDERER_URL';

/** Everything an app decides. What is the same for both apps is not asked for. */
export type StartHostConfig = Pick<CreateWindowOptions, 'appId' | 'title' | 'icon'> &
    // What only this app answers and the documents it reads and writes; an empty list is a choice.
    Pick<HandlerDeps, 'handlers' | 'formats' | 'stores' | 'folderSettings' | 'forgetWorkspace'> & {
        kind: WorkspaceKind;
        /** The page where a version of the app can be taken, for the installs that cannot update by themselves. */
        homepage: string;
        /** What the menu calls the app: the host never works it out from `kind`. */
        productName: string;
        /**
         * The folder of the app under the documents folder, which a person reads on disk: named
         * after the app they installed, never worked out from `kind`.
         */
        repoFolder: string;
        /** The directory the main bundle of the app runs in: the renderer and preload sit beside it. */
        mainDir: string;
    };

/**
 * Brings up an app: the limits, the menu, the window, every handler of main, and what undoes
 * them when the last window closes or the app quits. An app calls this and has nothing else to
 * arrange.
 *
 * The prologue runs before the first await on purpose. Electron reads the command line while it
 * boots and builds its own menu unless one is already set, so a switch or a menu that arrives
 * after `ready` is accepted and ignored, which is worse than failing.
 */
export async function startHost(config: StartHostConfig): Promise<void> {
    const timeline = createStartupTimeline();

    timeline.mark('host-start');
    applyChromiumLimits(app.commandLine);
    registerRendererScheme(protocol);
    // The menu speaks the provisional language until the renderer says which one it prefers.
    const holder = createAppMenuHolder({
        build: (language, updates) =>
            buildAppMenu(config.productName, language, process.platform, updates),
        install: (template) => installAppMenu(electronMenuPort(), template, process.platform),
        kind: config.kind,
    });

    // A second copy of the app would fight the first one over the same repos on disk, and the
    // run that ends an install has nothing to open: the app it replaces waits for it to go.
    if (isInstallRun(process.env) || !app.requestSingleInstanceLock()) {
        app.quit();

        return;
    }

    await app.whenReady();
    timeline.mark('app-ready');
    await run(config, { holder, timeline });
}

/** What runs once `ready` is in: what lasts the whole run, and then the first window. */
async function run(
    config: StartHostConfig,
    started: Pick<OpenDeps, 'holder' | 'timeline'>,
): Promise<void> {
    const userDataDir = app.getPath('userData');
    const logger = createLogger({
        file: join(userDataDir, 'mandor.log'),
        level: logLevelOf(process.env[LEVEL_VARIABLE]),
    });
    const layout = appLayout(config.mainDir, unpackagedVariable(DEV_SERVER_VARIABLE));
    const renderer = createRendererProtocol(layout.entryUrl);
    // One value for the whole run, made before anything is served: the document quotes it and
    // the policy header signs with it, and the two are only the same value if nobody makes a
    // second one.
    const cspNonce = createCspNonce();
    const disposeRenderer = registerRendererProtocol(renderer, cspNonce);
    // One updater for the whole run: its port listens to the library and its timers survive a
    // window closing on macOS, so a window that comes back does not count them twice.
    const update = electronUpdateDeps(logger, config.homepage);
    const about = electronAboutDeps(config.productName, config.icon);
    const appearance = electronAppearanceDeps();
    // The workers of scripts outlive a window, like the approvals: they close when the run ends.
    const scripts = await openScripts(userDataDir, layout.scriptWorker);
    const deps = { ...started, about, appearance, cspNonce, logger, scripts, update, userDataDir };
    const options = { ...config, ...layout, entryUrl: renderer.entryUrl };
    const session = createOneSession(
        () => openSession(options, deps),
        (opened) => {
            opened.dispose();
        },
    );

    followTheApp(session, { logger, disposeRenderer, scripts, update });
    await session.open();
}

type OpenDeps = Pick<
    HandlerDeps,
    'about' | 'appearance' | 'holder' | 'logger' | 'scripts' | 'timeline' | 'update' | 'userDataDir'
> & {
    cspNonce: string;
};

type RunDeps = {
    logger: Logger;
    /** What only the end of the run undoes: the protocol serves every window the run opens. */
    disposeRenderer: () => void;
    /** Ends the parked workers of scripts and refuses the chains that wait for one. */
    scripts: { close: () => void };
    update: { installOnQuit: () => void };
};

/**
 * What the app does with its one window as the system asks: a second copy brings it forward,
 * the last window closing ends it (and the run, but on macOS), the dock icon opens one again,
 * and quitting ends both the window and the run.
 */
function followTheApp(session: OneSession<CreatedWindow>, deps: RunDeps): void {
    app.on('second-instance', () => {
        const opened = session.current();

        if (opened !== null) {
            focusWindow(opened.window);
        }
    });
    app.on('window-all-closed', () => {
        session.close();
        quitUnlessMac();
    });
    // Only macOS sends it: a click on the dock icon of an app with no window asks for one.
    app.on('activate', () => {
        void session.open().catch((error: unknown) => {
            deps.logger.log('error', `the window could not open again: ${String(error)}`);
        });
    });
    app.on(
        'will-quit',
        once(() => {
            session.close();
            deps.scripts.close();
            deps.disposeRenderer();
        }),
    );
    holdQuitForSession(deps.update.installOnQuit);
}

/** The local origin and then the window: a window that comes back finds its origin open again. */
async function openSession(config: OpenConfig, deps: OpenDeps): Promise<CreatedWindow> {
    await openLocalOrigin(config, deps.userDataDir, deps.logger, deps.holder.language());
    deps.timeline.mark('origin-open');

    return open(config, deps);
}

/** What a window opens with: the choices of the app, and where its pieces were built. */
type OpenConfig = StartHostConfig & CreateWindowOptions & Pick<AppLayout, 'importWorker'>;

function open(config: OpenConfig, deps: OpenDeps): CreatedWindow {
    const { cspNonce, holder, logger, timeline } = deps;
    const created = createWindow(
        {
            ...config,
            onShown: () => {
                timeline.mark('ready-to-show');
            },
        },
        cspNonce,
    );

    timeline.mark('window-created');

    const notices = createNoticeOutbox(created.window);

    void noticeMissingKeychain(notices);
    watchFocusEvents(created.window, requestSync);

    const undo = [
        created.dispose,
        // Before the window there is nobody to tell, and Electron's own dialog is the answer.
        watchProcessFaults(process, logger, notices),
        watchWindowFaults(created.window, {
            app,
            ask: nativeAsk(created.window, holder.language),
            logger,
            now: Date.now,
            outbox: notices,
            quit: () => {
                app.quit();
            },
        }),
        bindRuntimeWindow(created.window),
        bindDialogParent(created.window),
        closeOriginRuntime,
        installDevTools(created.window, logger),
        // The choices of the app (kind, handlers, formats, stores) go through as it gave them.
        ...registerHandlers(trustedSenderIpc(ipcMain, config.entryUrl, logger), {
            ...config,
            ...deps,
            window: created.window,
            notices,
        }),
    ];

    logger.log('info', `the host is up for ${config.kind}`);

    return {
        window: created.window,
        dispose: once(() => {
            for (const step of undo) {
                step();
            }

            logger.log('info', 'the host released its window, its handlers and its sockets');
        }),
    };
}

/** macOS is the only platform where an app with no windows is still a running app. */
function quitUnlessMac(): void {
    if (process.platform === 'darwin') {
        return;
    }

    app.quit();
}
