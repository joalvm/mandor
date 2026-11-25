import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AppHandlerContext } from '@mandor/host';
import { forgetSecrets, noScripts, silentNotices, spyWindow } from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { historyDir, historyFileName } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { historyEntryOf } from '../../../../src/main/history/history-entry-of.js';
import { HISTORY_MAX_AGE_DAYS } from '../../../../src/main/history/history-limits.js';
import { createHistoryRetention } from '../../../../src/main/history/history-retention.js';
import { recordHistory } from '../../../../src/main/history/history-writer.js';
import { createSendRecorder } from '../../../../src/main/history/send-recorder.js';
import type { SendEvent } from '../../../../src/main/request/send-event.js';
import { failedSendOf, idOf, sendOf } from './history-fixture.js';

const DAY = 24 * 60 * 60 * 1000;

let root: string;
let window: ReturnType<typeof spyWindow>;
let warnings: string[];

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-send-recorder-'));
    window = spyWindow();
    warnings = [];
});

afterEach(async () => {
    forgetSecrets();
    await rm(root, { recursive: true, force: true });
});

function recorder() {
    const context: AppHandlerContext = {
        userDataDir: root,
        ...noScripts(),
        window: { ...window, isMaximized: () => false, on: () => undefined },
        logger: {
            log: (_level, message) => {
                warnings.push(message);
            },
            flush: () => Promise.resolve(),
        },
        notices: silentNotices(),
    };

    return createSendRecorder(context, createHistoryRetention());
}

/** The send as if it had just left: an old one would be pruned by age the moment it is filed. */
function justSent(event: SendEvent): SendEvent {
    return { ...event, startedAt: new Date() };
}

/** A time the history no longer keeps: the next send prunes what was sent then. */
function agedOut(): Date {
    return new Date(Date.now() - (HISTORY_MAX_AGE_DAYS + 1) * DAY);
}

async function filed(): Promise<string[]> {
    return readdir(join(root, '.mandor', 'history', 'pagos')).catch(() => []);
}

describe('what the recorder remembers of the sends it is told of', () => {
    it('files a send that was answered, and tells the window', async () => {
        await recorder()(justSent(sendOf(root, 1)));

        expect(await filed()).toHaveLength(1);
        expect(window.sent.map(([channel]) => channel)).toEqual([CHANNELS.historyAppended]);
    });

    /** The list in the window lets them go too, so it never shows a send the disk has not. */
    it('tells the window, with the send, which ones the limits took out to make room', async () => {
        await recordHistory(
            root,
            await historyEntryOf(root, sendOf(root, 1, { sentAt: agedOut() })),
        );
        await recorder()(justSent(sendOf(root, 2)));

        expect(await filed()).toHaveLength(1);
        expect(window.sent.at(0)?.[1]).toMatchObject({ removed: [idOf(1)], workspaceId: 'pagos' });
    });

    /** A folder where an entry should be cannot be removed: pruning fails, the send stays told. */
    it('still tells the window of the send when the limits could not be applied', async () => {
        const aged = historyFileName(agedOut().toISOString(), idOf(1));

        await mkdir(join(historyDir(root, 'pagos'), aged), { recursive: true });
        await recorder()(justSent(sendOf(root, 2)));

        expect(window.sent.at(0)?.[1]).toMatchObject({ removed: [] });
        expect(warnings.some((message) => message.startsWith('history:'))).toBe(true);
    });

    it('files a send that went out and then failed on the network', async () => {
        await recorder()(justSent(failedSendOf(root, 1, 'request-timeout')));

        expect(await filed()).toHaveLength(1);
    });

    it('forgets a send the user cut, because the user changed their mind', async () => {
        await recorder()(justSent(failedSendOf(root, 1, 'request-aborted')));

        expect(await filed()).toEqual([]);
        expect(window.sent).toEqual([]);
    });

    it('forgets a send that ended before anything was resolved, as no request ever existed', async () => {
        await recorder()(justSent({ ...sendOf(root, 1), sent: undefined }));

        expect(await filed()).toEqual([]);
    });

    it('forgets a failure that did not go out', async () => {
        await recorder()(justSent(failedSendOf(root, 1, 'bad-request')));

        expect(await filed()).toEqual([]);
    });

    it('says in the log, and never throws, when the disk refuses the entry', async () => {
        const file = join(root, 'not-a-folder');

        await writeFile(file, '');
        await recorder()(justSent(sendOf(join(file, 'inside'), 1)));

        expect(warnings.some((message) => message.startsWith('history:'))).toBe(true);
        expect(window.sent).toEqual([]);
    });
});
