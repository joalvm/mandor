import { CHANNELS, updateStateResultSchema, type UpdateState } from '@mandor/ipc';
import { vi, type Mock } from 'vitest';

import {
    spyIpc,
    spyWindow,
    type IpcSpy,
    type WindowSpy,
} from '../../src/testing/handler-harness.js';
import type { UpdateMenu } from '../../src/menu/update-menu.js';
import type { NoticeOutbox } from '../../src/notice/raise-notice.js';
import { registerUpdateHandlers } from '../../src/update/update.handlers.js';
import type { UpdatePort, UpdatePortEvent } from '../../src/update/update-port.js';
import type { UpdateSchedule } from '../../src/update/update-schedule.js';

export const NEXT = { version: '0.2.0', notes: '# Novedades' };

export type Harness = {
    announce: Mock<(menu: UpdateMenu) => void>;
    dispose: () => void;
    emit: (event: UpdatePortEvent) => void;
    ipc: IpcSpy;
    openExternal: ReturnType<typeof vi.fn>;
    settle: Mock<() => Promise<void>>;
    schedule: { [K in keyof UpdateSchedule]: Mock<UpdateSchedule[K]> };
    outbox: NoticeOutbox;
    port: UpdatePort & {
        checkForUpdates: ReturnType<typeof vi.fn>;
        downloadUpdate: ReturnType<typeof vi.fn>;
        quitAndInstall: ReturnType<typeof vi.fn>;
    };
    window: WindowSpy;
};

export function start(
    support: UpdateState['support'] = 'full',
    homepage = 'https://github.com/joalvm/mandor',
): Harness {
    let listener: (event: UpdatePortEvent) => void = () => undefined;
    const port = {
        currentVersion: '0.1.0',
        checkForUpdates: vi.fn(() => Promise.resolve()),
        downloadUpdate: vi.fn(() => Promise.resolve()),
        hasDownloaded: () => false,
        quitAndInstall: vi.fn(),
        setChannel: vi.fn(),
        setAutoDownload: vi.fn(),
        onEvent: (handler: (event: UpdatePortEvent) => void) => {
            listener = handler;

            return () => {
                listener = () => undefined;
            };
        },
    };
    const ipc = spyIpc();
    const window = spyWindow();
    const outbox = { raise: vi.fn(), list: () => [] } satisfies NoticeOutbox;
    const openExternal = vi.fn(() => Promise.resolve());
    const settle = vi.fn<() => Promise<void>>(() => Promise.resolve());
    const schedule = {
        configure: vi.fn<UpdateSchedule['configure']>(),
        ready: vi.fn<UpdateSchedule['ready']>(),
        dispose: vi.fn<UpdateSchedule['dispose']>(),
    };
    const announce = vi.fn<(menu: UpdateMenu) => void>();
    const dispose = registerUpdateHandlers(ipc, {
        announce,
        port,
        support,
        outbox,
        target: window,
        logger: { log: () => undefined, flush: () => Promise.resolve() },
        homepage,
        openExternal,
        settle,
        schedule,
    });

    return {
        announce,
        dispose,
        emit: (event) => {
            listener(event);
        },
        ipc,
        openExternal,
        settle,
        schedule,
        outbox,
        port,
        window,
    };
}

export async function stateOf(harness: Harness): Promise<UpdateState> {
    const answer = updateStateResultSchema.parse(await harness.ipc.call(CHANNELS.updateState));

    if (!answer.ok) {
        throw new Error('the state was refused');
    }

    return answer.value;
}
