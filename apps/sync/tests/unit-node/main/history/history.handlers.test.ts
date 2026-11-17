import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CHANNELS } from '@mandor/ipc';
import { REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    filesOf,
    listedBy,
    payload,
    SECRET,
    startHarness,
    stopHarness,
    type Harness,
} from './history-harness.js';

let h: Harness;

beforeEach(async () => {
    h = await startHarness();
});

afterEach(async () => {
    await stopHarness(h);
});

describe('remembering what was sent', () => {
    it('writes one file per send, answers the send, and tells the window', async () => {
        const answer = await h.ipc.call(CHANNELS.requestSend, payload('{{baseUrl}}/echo'));

        expect(answer).toMatchObject({ ok: true, value: { status: 200 } });
        expect(await filesOf(h)).toHaveLength(1);
        expect(h.window.sent).toHaveLength(1);
        expect(h.window.sent[0]).toMatchObject([
            CHANNELS.historyAppended,
            {
                workspaceId: 'payments',
                summary: { itemPath: 'orders/list', outcome: { kind: 'response', status: 200 } },
            },
        ]);
    });

    /** The server echoes the secret it was sent, and the request carried it: neither may be kept. */
    it('keeps no secret on disk, neither the one sent nor the one echoed back', async () => {
        await h.ipc.call(CHANNELS.requestSend, payload('{{baseUrl}}/echo'));

        const [name = ''] = await filesOf(h);
        const text = await readFile(join(h.root, '.mandor', 'history', 'payments', name), 'utf8');

        expect(text).toContain(REDACTED);
        expect(text).not.toContain(SECRET);
    });

    /**
     * Port 1 has nobody listening. A port of the test closed a moment ago does not do: another
     * worker can be given it before the send leaves, and its server answers instead.
     */
    it('remembers a send that went out and failed, with its reason', async () => {
        const answer = await h.ipc.call(CHANNELS.requestSend, payload('http://127.0.0.1:1/echo'));

        expect(answer).toMatchObject({ ok: false, error: { code: 'request-unreachable' } });
        expect(await listedBy(h)).toMatchObject([
            { itemPath: 'orders/list', outcome: { kind: 'failure', code: 'request-unreachable' } },
        ]);
    });

    it('remembers nothing of a send the user cut', async () => {
        const sendId = crypto.randomUUID();
        const pending = h.ipc.call(CHANNELS.requestSend, payload('{{baseUrl}}/slow', { sendId }));

        await vi.waitFor(() => {
            expect(h.arrived).toContain('/slow');
        });
        await h.ipc.call(CHANNELS.requestCancel, { sendId });

        expect(await pending).toMatchObject({ ok: false, error: { code: 'request-aborted' } });
        expect(await filesOf(h)).toEqual([]);
        expect(h.window.sent).toEqual([]);
    });

    it('remembers nothing of a send that never left, because nothing was resolved', async () => {
        const answer = await h.ipc.call(CHANNELS.requestSend, { nonsense: true });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
        expect(await filesOf(h)).toEqual([]);
    });

    it('answers the send even when the history cannot be written, and logs a warning', async () => {
        // A file where the folder of the history should be: the entry cannot be written.
        await mkdir(join(h.root, '.mandor'), { recursive: true });
        await writeFile(join(h.root, '.mandor', 'history'), 'not a folder');

        const answer = await h.ipc.call(CHANNELS.requestSend, payload('{{baseUrl}}/echo'));

        expect(answer).toMatchObject({ ok: true, value: { status: 200 } });
        expect(h.warnings).toHaveLength(1);
        expect(h.warnings[0]).toMatch(/^history: /);
        expect(h.window.sent).toEqual([]);
    });
});
