import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerWindowHandlers, type WindowTarget } from '../../src/window/window.handlers.js';
import {
    type IpcSpy,
    spyIpc,
    spyWindow,
    type WindowSpy,
} from '../../src/testing/handler-harness.js';
import { holderOf, type OpenedMenu } from './support/silent-holder.js';

type TargetSpy = WindowTarget & {
    closed: number;
    maximizedActions: ('maximize' | 'unmaximize')[];
    maximized: boolean;
};

let ipc: IpcSpy;
let window: WindowSpy;
let target: TargetSpy;
let notifies: ((maximized: boolean) => void)[];
let appMenu: OpenedMenu<TargetSpy>;
let dispose: () => void;
let relaunch: () => Promise<void>;
const onReady = vi.fn<() => void>();

function spyTarget(): TargetSpy {
    const spy: TargetSpy = {
        closed: 0,
        maximizedActions: [],
        maximized: false,
        close: () => {
            spy.closed += 1;
        },
        isMaximized: () => spy.maximized,
        maximize: () => {
            spy.maximizedActions.push('maximize');
        },
        minimize: () => undefined,
        unmaximize: () => {
            spy.maximizedActions.push('unmaximize');
        },
    };

    return spy;
}

function call(channel: (typeof CHANNELS)[keyof typeof CHANNELS], payload: unknown) {
    return ipc.call(channel, payload) as Promise<Result<Empty>>;
}

beforeEach(() => {
    ipc = spyIpc();
    window = spyWindow();
    target = spyTarget();
    notifies = [];
    appMenu = { popup: vi.fn() };
    relaunch = vi.fn(() => Promise.resolve());
    dispose = registerWindowHandlers(ipc, {
        window,
        windowOf: () => target,
        watchMaximized: (notify) => {
            notifies.push(notify);
        },
        holder: holderOf(() => appMenu),
        relaunch,
        onReady,
    });
});

afterEach(() => {
    dispose();
});

describe('the window handlers of main', () => {
    it('tells the start the window is ready, and refuses a payload with anything in it', async () => {
        const answer = await call(CHANNELS.windowReady, undefined);
        const refused = await call(CHANNELS.windowReady, { at: 12 });

        expect([answer.ok, refused.ok]).toEqual([true, false]);
        expect(onReady).toHaveBeenCalledOnce();
    });

    /**
     * The bridge sends these channels with no payload, which arrives as `undefined` over the
     * wire. The handler accepts it as the empty request — an `{}` here would hide exactly the
     * refusal that left the real buttons doing nothing.
     */
    it('acts on the absent payload the bridge sends, never on one the payload names', async () => {
        await call(CHANNELS.windowMinimize, undefined);
        await call(CHANNELS.windowClose, undefined);

        expect(target.closed).toBe(1);
    });

    it('maximizes a restored window and restores a maximized one', async () => {
        target.maximized = false;

        await call(CHANNELS.windowToggleMaximize, undefined);

        expect(target.maximizedActions).toEqual(['maximize']);

        target.maximized = true;
        target.maximizedActions = [];

        await call(CHANNELS.windowToggleMaximize, undefined);

        expect(target.maximizedActions).toEqual(['unmaximize']);
    });

    it('pushes what the window announced about its maximized state', () => {
        expect(notifies).toHaveLength(1);
        notifies[0]?.(true);
        notifies[0]?.(false);

        expect(window.sent).toEqual([
            [CHANNELS.windowMaximized, { maximized: true }],
            [CHANNELS.windowMaximized, { maximized: false }],
        ]);
    });

    it('refuses a payload that is not the empty request', async () => {
        const answer = (await call(CHANNELS.windowMinimize, { windowId: 7 })) as {
            ok: boolean;
        };

        expect(answer.ok).toBe(false);
        expect(target.closed).toBe(0);
    });

    it('refuses to act when the window that sent the message is gone', async () => {
        const gone = spyIpc();

        registerWindowHandlers(gone, {
            window,
            windowOf: () => undefined,
            watchMaximized: () => undefined,
            holder: holderOf(() => appMenu),
            relaunch,
            onReady: () => undefined,
        });
        const answer = (await gone.call(CHANNELS.windowClose, {})) as { ok: boolean };

        expect(answer.ok).toBe(false);
        expect(target.closed).toBe(0);
    });

    it('opens the options menu under the corner the renderer sent', async () => {
        await call(CHANNELS.windowPopupMenu, { x: 12, y: 39 });

        expect(appMenu.popup).toHaveBeenCalledOnce();
        expect(appMenu.popup).toHaveBeenCalledWith({ window: target, x: 12, y: 39 });
    });

    it('refuses to open a menu without a window to open it over', async () => {
        const gone = spyIpc();

        registerWindowHandlers(gone, {
            window,
            windowOf: () => undefined,
            watchMaximized: () => undefined,
            holder: holderOf(() => appMenu),
            relaunch,
            onReady: () => undefined,
        });
        const answer = (await gone.call(CHANNELS.windowPopupMenu, { x: 12, y: 39 })) as {
            ok: boolean;
        };

        expect(answer.ok).toBe(false);
        expect(appMenu.popup).not.toHaveBeenCalled();
    });

    it('starts the app over when the window asks, and answers before it is gone', async () => {
        await expect(ipc.call(CHANNELS.appRelaunch)).resolves.toEqual({ ok: true, value: {} });

        expect(relaunch).toHaveBeenCalledOnce();
    });

    it('refuses a relaunch that carries anything', async () => {
        await expect(ipc.call(CHANNELS.appRelaunch, { force: true })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });

        expect(relaunch).not.toHaveBeenCalled();
    });

    it('leaves no handler behind when disposed', () => {
        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
