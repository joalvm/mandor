import { fileURLToPath } from 'node:url';
import type { Worker } from 'node:worker_threads';

import { afterEach, describe, expect, it } from 'vitest';

import { newScriptSlots, startScriptWorker } from '../../src/script/start-script-worker.js';
import type { WorkerSlots } from '../../src/script/worker-slots.js';

const FIXTURE = fileURLToPath(new URL('./fixtures/scripted-script-worker.mjs', import.meta.url));
const opened: WorkerSlots<Worker>[] = [];

function slotsOf(limit: number): WorkerSlots<Worker> {
    const slots = newScriptSlots(FIXTURE, { limit, idleMs: 60_000 });

    opened.push(slots);

    return slots;
}

function threadOf(
    outcome: Awaited<ReturnType<ReturnType<typeof startScriptWorker>['run']>>,
): string {
    if (!outcome.ok) {
        throw new Error(outcome.error.message);
    }

    return outcome.output;
}

afterEach(() => {
    for (const slots of opened.splice(0)) {
        slots.close();
    }
});

describe('a chain of scripts', () => {
    it('gives the output of a script', async () => {
        const chain = startScriptWorker(slotsOf(1));

        expect(await chain.run('ok')).toEqual({ ok: true, output: 'ok' });
    });

    it('runs its scripts one after another on the same worker', async () => {
        const chain = startScriptWorker(slotsOf(1));
        const first = threadOf(await chain.run('thread'));
        const second = threadOf(await chain.run('thread'));

        expect(second).toBe(first);
    });

    it('takes another worker for the script after one that was thrown away', async () => {
        const chain = startScriptWorker(slotsOf(1));
        const first = threadOf(await chain.run('thread'));

        await chain.run('die');

        const second = threadOf(await chain.run('thread'));

        expect(second).not.toBe(first);
    });

    it('throws a worker away after a fault of the engine, and goes on with a new one', async () => {
        const chain = startScriptWorker(slotsOf(1));
        const first = threadOf(await chain.run('thread'));

        await chain.run('fault-memory');

        expect(threadOf(await chain.run('thread'))).not.toBe(first);
    });

    it('serves two chains of the same app with two workers when the limit allows', async () => {
        const slots = slotsOf(2);
        const [one, other] = await Promise.all([
            startScriptWorker(slots).run('thread'),
            startScriptWorker(slots).run('thread'),
        ]);

        expect(threadOf(one)).not.toBe(threadOf(other));
    });

    it('makes the second chain wait for the only worker, and serves both', async () => {
        const slots = slotsOf(1);
        const [one, other] = await Promise.all([
            startScriptWorker(slots).run('thread'),
            startScriptWorker(slots).run('thread'),
        ]);

        expect(threadOf(one)).toBe(threadOf(other));
    });

    it('cancels the script in flight when the caller aborts, and frees the worker', async () => {
        const slots = slotsOf(1);
        const chain = startScriptWorker(slots);
        const controller = new AbortController();
        const running = chain.run('hang', controller.signal);

        controller.abort();

        expect(await running).toMatchObject({ ok: false, error: { errorName: 'Cancelled' } });
        expect(await chain.run('ok')).toEqual({ ok: true, output: 'ok' });
    });

    it('cancels a script that still waits for a worker', async () => {
        const slots = slotsOf(1);
        const chain = startScriptWorker(slots);
        const holding = chain.run('hang', undefined);
        const controller = new AbortController();
        const waiting = startScriptWorker(slots).run('ok', controller.signal);

        controller.abort();

        expect(await waiting).toMatchObject({ ok: false, error: { errorName: 'Cancelled' } });

        chain.close();
        await holding;
    });

    it('cancels the script in flight on close, and refuses the next', async () => {
        const chain = startScriptWorker(slotsOf(1));
        const running = chain.run('hang');

        chain.close();

        expect(await running).toMatchObject({ ok: false, error: { errorName: 'Cancelled' } });
        expect(await chain.run('ok')).toMatchObject({
            ok: false,
            error: { errorName: 'Cancelled' },
        });
    });

    it('says the workers are closed when the app closed them', async () => {
        const slots = slotsOf(1);
        const chain = startScriptWorker(slots);

        slots.close();

        expect(await chain.run('ok')).toEqual({
            ok: false,
            error: { message: 'The script workers are closed', errorName: 'Closed' },
        });
    });

    it('cuts a script at the time it is given', async () => {
        const chain = startScriptWorker(slotsOf(1), { runMs: 100, slackMs: 0 });

        expect(await chain.run('hang')).toMatchObject({
            ok: false,
            error: { errorName: 'Timeout' },
        });
    });

    it('gives the answer of main to a script that sends', async () => {
        const chain = startScriptWorker(slotsOf(1), { onSend: () => Promise.resolve('reply') });

        expect(
            await chain.run(JSON.stringify({ event: 'onBeforeRequest', behavior: 'send-wait' })),
        ).toEqual({ ok: true, output: 'got:reply' });
    });
});
