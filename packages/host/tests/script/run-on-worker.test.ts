import { afterEach, describe, expect, it } from 'vitest';

import { runOnWorker, type RunSettings } from '../../src/script/run-on-worker.js';

import { asking, BASE, failure, run, spawn, terminateAll } from './fixtures/worker-runs.js';

afterEach(terminateAll);

describe('a script that ends by itself', () => {
    it('gives its output and lets the worker go on', async () => {
        expect(await run('ok')).toEqual({ outcome: { ok: true, output: 'ok' }, reuse: true });
    });

    it('gives the error of a script that threw and lets the worker go on', async () => {
        const finished = await run('script-error');

        expect(finished.outcome).toEqual({
            ok: false,
            error: { message: 'boom', errorName: 'Error', line: 1 },
        });
        expect(finished.reuse).toBe(true);
    });

    it('does not let the worker go on after a fault of the engine', async () => {
        const finished = await run('fault-memory');

        expect(failure(finished).errorName).toBe('InternalError');
        expect(finished.reuse).toBe(false);
    });

    it('takes the first done and ignores what comes after it', async () => {
        expect((await run('double-done')).outcome).toEqual({ ok: true, output: 'first' });
    });

    it('runs in a worker with an empty environment', async () => {
        expect((await run('env')).outcome).toEqual({ ok: true, output: '0' });
    });

    it('stops listening to the worker once it ended', async () => {
        const worker = spawn();

        await runOnWorker(worker, 'ok', new AbortController().signal, BASE);

        // The one listener of `error` left is the one `spawn` keeps, as the slots do.
        expect([
            worker.listenerCount('message'),
            worker.listenerCount('messageerror'),
            worker.listenerCount('exit'),
            worker.listenerCount('error'),
        ]).toEqual([0, 0, 0, 1]);
    });
});

// Main takes the sends and never answers them: the violation is what ends the run.
const HOLDS: Partial<RunSettings> = { onSend: () => new Promise<string>(() => undefined) };

describe('a worker that breaks the protocol', () => {
    it.each<[string, string, Partial<RunSettings>]>([
        ['a done with no output', 'empty-done', {}],
        ['a done of another run', 'foreign-run', {}],
        ['a message that is not of the protocol', 'garbage', {}],
        ['a run started by the worker', 'worker-asks-run', {}],
        ['a waiting without a send', 'waiting-alone', {}],
        ['a second start of the script', 'start-twice', {}],
        ['the same send twice', asking('send-twice'), HOLDS],
        ['a send in a run that admits none', asking('send-and-run'), {}],
        ['a send in an event that has none', asking('send-wait', 'onMessage'), HOLDS],
    ])('is cut on %s', async (_name, input, settings) => {
        const finished = await run(input, settings);

        expect(failure(finished).errorName).toBe('Violation');
        expect(finished.reuse).toBe(false);
    });

    it('is cut when its error has more bytes than an output may have', async () => {
        const finished = await run('huge-error');

        expect(failure(finished)).toMatchObject({ errorName: 'Violation' });
        expect(failure(finished).message).toContain('1048576 bytes');
        expect(finished.reuse).toBe(false);
    });

    it('is cut when the output has more bytes than the limit, though fewer characters', async () => {
        const finished = await run('multibyte');

        expect(failure(finished)).toMatchObject({ errorName: 'Violation' });
        expect(failure(finished).message).toContain('1048576 bytes');
        expect(finished.reuse).toBe(false);
    });
});

describe('a worker that hangs, dies or bursts', () => {
    it('is cut at the time of the script plus the slack', async () => {
        const started = performance.now();
        const finished = await run('hang', { runMs: 100, slackMs: 50 });

        expect(failure(finished)).toEqual({
            errorName: 'Timeout',
            message: 'The script ran longer than 100 ms',
            limit: 100,
        });
        expect(finished.reuse).toBe(false);
        expect(performance.now() - started).toBeGreaterThanOrEqual(140);
    });

    it('is cut when it never begins the script, once its start time is out', async () => {
        const finished = await run('mute', { startMs: 100 });

        expect(failure(finished)).toEqual({
            errorName: 'Timeout',
            message: 'The script worker did not start the script in time',
        });
        expect(finished.reuse).toBe(false);
    });

    it('does not count its start in the time of the script', async () => {
        const finished = await run('slow-start', { runMs: 100 });

        expect(finished.outcome).toEqual({ ok: true, output: 'late start' });
    });

    it('is cut when a script sends and goes on running without waiting', async () => {
        const finished = await run(asking('send-and-run'), {
            runMs: 100,
            // Main never answers, and the guest never says it waits: nothing stops the clock.
            onSend: () => new Promise<string>(() => undefined),
        });

        expect(failure(finished).errorName).toBe('Timeout');
    });

    it('is reported when it dies', async () => {
        const finished = await run('die');

        expect(failure(finished)).toEqual({
            errorName: 'WorkerDied',
            message: 'The script worker exited with code 3',
        });
        expect(finished.reuse).toBe(false);
    });

    it('is reported when it runs out of heap', async () => {
        // The heap takes seconds to give out in a loaded container: the clock must not win the race.
        const finished = await run('heap', { runMs: 60_000 });

        expect(failure(finished).errorName).toBe('WorkerOutOfMemory');
        expect(finished.reuse).toBe(false);
    });

    it('is cut when the caller cancels', async () => {
        const controller = new AbortController();
        const running = run('hang', {}, controller.signal);

        controller.abort();

        const finished = await running;

        expect(failure(finished).errorName).toBe('Cancelled');
        expect(finished.reuse).toBe(false);
    });

    it('is not even asked when the caller cancelled before', async () => {
        const controller = new AbortController();

        controller.abort();

        expect(failure(await run('ok', {}, controller.signal)).errorName).toBe('Cancelled');
    });
});

describe('a script that sends', () => {
    it('gets the answer main gives and ends on it', async () => {
        const payloads: string[] = [];
        const finished = await run(asking('send-wait'), {
            onSend: (payload) => {
                payloads.push(payload);

                return Promise.resolve('reply');
            },
        });

        expect(finished.outcome).toEqual({ ok: true, output: 'got:reply' });
        expect(finished.reuse).toBe(true);
        expect(payloads).toEqual(['{"to":"x"}']);
    });

    it('is cut with an error when main fails to answer', async () => {
        const finished = await run(asking('send-wait'), {
            onSend: () => Promise.reject(new Error('no route')),
        });

        expect(failure(finished)).toEqual({ errorName: 'SendFailed', message: 'no route' });
        expect(finished.reuse).toBe(false);
    });

    it('does not spend its time while it waits for the answer', async () => {
        let answer: (reply: string) => void = () => undefined;
        let asked = false;
        const running = run(asking('send-wait'), {
            runMs: 600,
            onSend: () => {
                asked = true;

                return new Promise<string>((resolve) => {
                    answer = resolve;
                });
            },
        });

        await expect.poll(() => asked).toBe(true);

        // timing-policy: only a stretch of real time longer than the time of the script shows that
        // the clock is stopped while the answer is on its way.
        await new Promise((resolve) => setTimeout(resolve, 900));
        answer('late');

        expect((await running).outcome).toEqual({ ok: true, output: 'got:late' });
    });

    it('does not answer a script that was cut before the answer came', async () => {
        let answer: (reply: string) => void = () => undefined;
        const controller = new AbortController();
        let asked = false;
        const running = run(
            asking('send-wait'),
            {
                onSend: () => {
                    asked = true;

                    return new Promise<string>((resolve) => {
                        answer = resolve;
                    });
                },
            },
            controller.signal,
        );

        await expect.poll(() => asked).toBe(true);
        controller.abort();

        expect(failure(await running).errorName).toBe('Cancelled');
        expect(() => {
            answer('too late');
        }).not.toThrow();
    });
});
