import {
    appRelaunchRequestSchema,
    CHANNELS,
    failure,
    success,
    windowCloseRequestSchema,
    windowMinimizeRequestSchema,
    windowPopupMenuRequestSchema,
    windowReadyRequestSchema,
    windowToggleMaximizeRequestSchema,
    type Empty,
    type Result,
} from '@mandor/ipc';

import type { AppMenuHolder } from '../menu/app-menu-holder.js';
import { popupAppMenu } from '../menu/popup-app-menu.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import { pushToWindow, type PushTarget } from '../ipc/push-to-window.js';

/**
 * The slice of a `BrowserWindow` a handler acts on, named structurally so a plain node test can
 * stand in for it. The window is resolved from the message itself, so the payload stays empty:
 * a renderer that could name a window would own a window it did not open.
 */
export type WindowTarget = {
    close: () => void;
    isMaximized: () => boolean;
    maximize: () => void;
    minimize: () => void;
    unmaximize: () => void;
};

export type WindowHandlerDeps = {
    /** The window the app opened, which is where the maximized push goes. */
    window: PushTarget;
    /** Resolves the window that sent the message. It never reads one from the payload. */
    windowOf: (event: unknown) => WindowTarget | undefined;
    /** Subscribes the maximized announcements of the window. The listeners die with it. */
    watchMaximized: (notify: (maximized: boolean) => void) => void;
    /** The options menu, read at popup time: it may have been rebuilt in another language. */
    holder: AppMenuHolder;
    /** Starts the app over once what was being written has landed; it does not come back. */
    relaunch: () => Promise<void>;
    /** The window drew what it restored: the start, or a reload, is over. */
    onReady: () => void;
};

/**
 * The channels through which the renderer moves its own window, and the push that tells it
 * which icon the maximize button draws.
 */
export function registerWindowHandlers(ipc: HandlerIpc, deps: WindowHandlerDeps): () => void {
    ipc.handle(CHANNELS.windowMinimize, (event, raw) =>
        Promise.resolve(
            act(deps.windowOf(event), windowMinimizeRequestSchema, raw, (target) => {
                target.minimize();
            }),
        ),
    );
    ipc.handle(CHANNELS.windowToggleMaximize, (event, raw) =>
        Promise.resolve(
            act(deps.windowOf(event), windowToggleMaximizeRequestSchema, raw, (target) => {
                toggle(target);
            }),
        ),
    );
    ipc.handle(CHANNELS.windowClose, (event, raw) =>
        Promise.resolve(
            act(deps.windowOf(event), windowCloseRequestSchema, raw, (target) => {
                target.close();
            }),
        ),
    );
    ipc.handle(CHANNELS.windowPopupMenu, (event, raw) => {
        const request = windowPopupMenuRequestSchema.safeParse(raw);

        if (!request.success) {
            return Promise.resolve(failure('bad-request', request.error.message));
        }

        const target = deps.windowOf(event);

        if (target === undefined) {
            return Promise.resolve(failure('unknown', 'the window that sent the message is gone'));
        }

        popupAppMenu(deps.holder.current(), target, request.data.x, request.data.y);

        return Promise.resolve(success({}));
    });

    ipc.handle(CHANNELS.appRelaunch, (_event, raw) => {
        if (!appRelaunchRequestSchema.safeParse(raw ?? {}).success) {
            return Promise.resolve(
                failure('bad-request', 'the window channels take an empty request'),
            );
        }

        void deps.relaunch();

        return Promise.resolve(success({}));
    });

    ipc.handle(CHANNELS.windowReady, (_event, raw) => {
        if (!windowReadyRequestSchema.safeParse(raw ?? {}).success) {
            return Promise.resolve(
                failure('bad-request', 'the window channels take an empty request'),
            );
        }

        deps.onReady();

        return Promise.resolve(success({}));
    });

    deps.watchMaximized((maximized) => {
        pushToWindow(deps.window, CHANNELS.windowMaximized, { maximized });
    });

    return () => {
        ipc.removeHandler(CHANNELS.windowMinimize);
        ipc.removeHandler(CHANNELS.windowToggleMaximize);
        ipc.removeHandler(CHANNELS.windowClose);
        ipc.removeHandler(CHANNELS.windowPopupMenu);
        ipc.removeHandler(CHANNELS.appRelaunch);
        ipc.removeHandler(CHANNELS.windowReady);
    };
}

/** One direction or the other, decided by the window itself at the moment of the click. */
function toggle(target: WindowTarget): void {
    if (target.isMaximized()) {
        target.unmaximize();

        return;
    }

    target.maximize();
}

/**
 * Validates the empty request, resolves the window and acts. The bridge sends these channels
 * with no payload at all, and an absent payload is the empty object the schema expects — the
 * same courtesy every other channel without arguments receives. The answers carry nothing:
 * only the refusal ever has anything to say, and none of these actions can fail half done.
 */
function act(
    target: WindowTarget | undefined,
    schema: { safeParse: (raw: unknown) => { success: boolean } },
    raw: unknown,
    perform: (target: WindowTarget) => void,
): Result<Empty> {
    if (!schema.safeParse(raw ?? {}).success) {
        return failure('bad-request', 'the window channels take an empty request');
    }

    if (target === undefined) {
        return failure('unknown', 'the window that sent the message is gone');
    }

    perform(target);

    return success({});
}
