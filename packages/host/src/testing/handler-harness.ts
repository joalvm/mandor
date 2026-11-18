import type { Channel } from '@mandor/ipc';

import type { HandlerIpc, IpcListener } from '../ipc/handler-ipc.js';
import type { PushTarget } from '../ipc/push-to-window.js';
import type { NoticeOutbox } from '../notice/raise-notice.js';
import type { UnreadableDeps } from '../notice/unreadable-files.js';
import type { AppHandlerContext } from '../runtime/register-handlers.js';
import { createScriptVariables } from '../script/script-variables.js';
import { redactedIpc } from '../ipc/redacted-ipc.js';
import { setActiveOrigin } from '../origin/active-origin.js';
import { forgetSessionSecrets, sessionSecrets } from '../secret/session-secrets.js';

/**
 * What a test of a handler needs from the host, wherever the handler lives. A handler of one app
 * is written with the kit the host exports and tested with this harness, so a test in an app
 * reaches main the same way a test inside the host does, never through a path into its source.
 */

export type IpcSpy = HandlerIpc & {
    /** Invokes the handler of a channel the way Electron would, event first. */
    call: (channel: Channel, payload?: unknown) => Promise<unknown>;
    registered: () => Channel[];
};

/**
 * Stands in for `ipcMain` so the handlers can be exercised without an Electron process. It
 * keeps what was registered, which is how a test can see that a disposer left nothing behind.
 */
export function spyIpc(): IpcSpy {
    const handlers = new Map<Channel, IpcListener>();

    return {
        call: (channel, payload) => {
            const handler = handlers.get(channel);

            if (handler === undefined) {
                throw new Error(`No handler for ${channel}`);
            }

            return handler({}, payload);
        },
        registered: () => [...handlers.keys()],
        handle: (channel, listener) => {
            handlers.set(channel, listener);
        },
        removeHandler: (channel) => {
            handlers.delete(channel);
        },
    };
}

/**
 * What the handler of an app is handed: `ipc` behind the redaction the host puts on every
 * channel. A test that registers through it sees the answers the renderer would.
 */
export function redactingIpc(ipc: HandlerIpc): HandlerIpc {
    return redactedIpc(ipc);
}

export type WindowSpy = PushTarget & {
    sent: [channel: Channel, message: unknown][];
    destroy: () => void;
};

/** Stands in for a `BrowserWindow`, including the one thing that matters: it can be gone. */
export function spyWindow(): WindowSpy {
    const sent: [Channel, unknown][] = [];
    let destroyed = false;

    return {
        sent,
        destroy: () => {
            destroyed = true;
        },
        isDestroyed: () => destroyed,
        webContents: {
            send: (channel, message) => {
                sent.push([channel, message]);
            },
        },
    };
}

/** The outbox of an app handler under test that has nothing to say: it raises nowhere. */
export function silentNotices(): NoticeOutbox {
    return { raise: () => undefined, list: () => [] };
}

/** What a handler that reports unreadable files gets in a test that does not look at them. */
export function silentReporting(): UnreadableDeps {
    return {
        notices: silentNotices(),
        logger: { log: () => undefined, flush: () => Promise.resolve() },
    };
}

/**
 * The scripts of an app handler under test that runs none: nothing approved, the switch on, and
 * a chain that answers every run as closed. A test that runs scripts brings its own chain.
 */
export function noScripts(): Pick<AppHandlerContext, 'scripts' | 'scriptVariables'> {
    const closed = { message: 'The script workers are closed', errorName: 'Closed' };

    return {
        scripts: {
            startChain: () => ({
                run: () => Promise.resolve({ ok: false, error: closed }),
                close: () => undefined,
            }),
            approvals: {
                isApproved: () => Promise.resolve(false),
                approve: () => Promise.resolve(),
                forgetAll: () => Promise.resolve(),
            },
            scriptsSwitch: { enabled: () => true, set: () => Promise.resolve() },
        },
        scriptVariables: createScriptVariables(),
    };
}

/** Makes `root` the repo the handlers read, the way the local origin opened at start does. */
export function openRepo(root: string): void {
    setActiveOrigin({ id: 'local', name: 'Local', kind: 'local', root });
}

/** Leaves the handlers with no repo, as before any origin opened. */
export function closeRepo(): void {
    setActiveOrigin(null);
}

/** The secret values this run has learned, which every border redacts. */
export function secretsOfRun(): readonly string[] {
    return sessionSecrets();
}

/** Forgets what the run learned, so one test does not redact for the next. */
export function forgetSecrets(): void {
    forgetSessionSecrets();
}
