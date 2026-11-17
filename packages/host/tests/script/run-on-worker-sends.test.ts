import { afterEach, describe, expect, it } from 'vitest';

import { asking, run, terminateAll } from './fixtures/worker-runs.js';

afterEach(terminateAll);

describe('the sends of a script', () => {
    it('answers the ones past the quota with an error, and never asks main for them', async () => {
        const asked: string[] = [];
        const finished = await run(asking('send-many'), {
            onSend: (payload) => {
                asked.push(payload);

                return Promise.resolve('ok');
            },
        });
        const failed = JSON.stringify({
            ok: false,
            message: 'A script may send 10 requests per run',
        });

        expect(finished.outcome).toEqual({
            ok: true,
            output: `got:${[...Array<string>(10).fill('ok'), failed, failed].join(',')}`,
        });
        expect(asked).toHaveLength(10);
    });

    it('ends the send in flight when the run is cut', async () => {
        const controller = new AbortController();
        let sending: AbortSignal | undefined;
        const running = run(
            asking('send-wait'),
            {
                onSend: (_payload, signal) => {
                    sending = signal;

                    return new Promise<string>(() => undefined);
                },
            },
            controller.signal,
        );

        await expect.poll(() => sending).toBeDefined();
        expect(sending?.aborted).toBe(false);
        controller.abort();
        await running;

        expect(sending?.aborted).toBe(true);
    });

    it('keeps the clock stopped until every send the guest waits on is answered', async () => {
        const answers: ((reply: string) => void)[] = [];
        const running = run(asking('send-two'), {
            runMs: 300,
            onSend: () =>
                new Promise<string>((resolve) => {
                    answers.push(resolve);
                }),
        });

        await expect.poll(() => answers.length).toBe(2);
        answers[0]?.('a');

        // timing-policy: only a stretch of real time longer than the time of the script shows that
        // the clock stays stopped while the second send is still on its way.
        await new Promise((resolve) => setTimeout(resolve, 500));
        answers[1]?.('b');

        expect((await running).outcome).toEqual({ ok: true, output: 'got:a,b' });
    });
});
