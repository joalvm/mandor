import { describe, expect, it } from 'vitest';

import { runChain } from '../../src/script/run-chain.js';
import { PLACE, depsOf, heldSend, runOf, script } from './fixtures/chain-runs.js';

/** Sets `a` once the send main holds is answered, whatever the answer was. */
function setAfterSend(value: string): string {
    return `try { await mandor.sendRequest({ url: "https://api.test" }); } catch {} mandor.variables.set("a", "${value}")`;
}

describe('runChain over time', () => {
    /** Wherever the script is when the time runs out, even still waiting for its worker. */
    it('keeps nothing of a run past the time of the chain', async () => {
        const { send } = heldSend();
        const deps = depsOf({ limits: { chainMs: 300 } });
        const result = await runChain(runOf([script(setAfterSend('late'))], { send }), deps);

        expect(result.error).toMatchObject({ errorName: 'Timeout', limit: 300 });
        expect(deps.variables.values(PLACE)).toEqual({});
    });

    /** The clock is stopped by the test once the send is in flight: a busy machine moves nothing. */
    it('cuts the send in flight when the time of the chain runs out', async () => {
        const { send, held, asked } = heldSend();
        const clock = new AbortController();
        const started: number[] = [];
        const deps = depsOf({
            limits: { chainMs: 300 },
            clock: (ms) => {
                started.push(ms);

                return clock.signal;
            },
        });
        const running = runChain(runOf([script(setAfterSend('late'))], { send }), deps);

        await asked;
        clock.abort();

        const result = await running;

        expect(started).toEqual([300]);
        expect(result.error).toMatchObject({ errorName: 'Timeout', limit: 300 });
        expect(held.signal?.aborted).toBe(true);
        expect(deps.variables.values(PLACE)).toEqual({});
    });

    it('aborts the send in flight when the chain is cancelled, and keeps nothing', async () => {
        const { send, held, asked } = heldSend();
        const controller = new AbortController();
        const deps = depsOf();
        const running = runChain(
            runOf([script(setAfterSend('late'))], { send, signal: controller.signal }),
            deps,
        );

        await asked;
        controller.abort();

        const result = await running;

        expect(result.error).toMatchObject({ errorName: 'Cancelled' });
        expect(held.signal?.aborted).toBe(true);
        expect(deps.variables.values(PLACE)).toEqual({});
    });

    it('drops what a run brings after its workspace was cleared', async () => {
        const { send, held, asked } = heldSend();
        const deps = depsOf();
        const running = runChain(runOf([script(setAfterSend('late'))], { send }), deps);

        await asked;
        deps.variables.clear(PLACE);
        held.answer?.(JSON.stringify({ ok: false, message: 'no' }));

        const result = await running;

        expect(result.error).toBeUndefined();
        expect(deps.variables.values(PLACE)).toEqual({});
    });

    it('keeps the value of the run that arrives last, not of the one that started last', async () => {
        const first = heldSend();
        const deps = depsOf();
        const slow = runChain(runOf([script(setAfterSend('slow'))], { send: first.send }), deps);

        await first.asked;
        await runChain(runOf([script('mandor.variables.set("a", "quick")')]), deps);

        expect(deps.variables.values(PLACE)).toEqual({ a: 'quick' });

        first.held.answer?.(JSON.stringify({ ok: false, message: 'no' }));
        await slow;

        expect(deps.variables.values(PLACE)).toEqual({ a: 'slow' });
    });
});
