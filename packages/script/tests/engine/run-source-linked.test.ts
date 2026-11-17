import { beforeAll, describe, expect, it } from 'vitest';

import { runSource } from '../../src/engine/run-source.js';
import { HOST_SEND } from '../../src/engine/send-bridge.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';

import { answeringLink } from './guest/support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

describe('runSource', () => {
    it('ends on what a script gives once its send is answered', async () => {
        const link = answeringLink((payload) => `${payload}!`);

        expect(
            await runSource(wasm, `${HOST_SEND}('a').then((reply) => 'got ' + reply)`, 1000, {
                link,
            }),
        ).toEqual({ ok: true, value: 'got a!' });
        expect(link.waits).toBe(1);
    });

    it('runs the sends one after another when each waits for the one before', async () => {
        const link = answeringLink((payload) => payload);
        const source = `${HOST_SEND}('a').then((first) => ${HOST_SEND}(first + 'b')).then((second) => second)`;

        expect(await runSource(wasm, source, 1000, { link })).toEqual({
            ok: true,
            value: 'ab',
        });
        expect(link.sent.map(({ sendId }) => sendId)).toEqual(['1', '2']);
    });

    it('does not count the wait for a slow answer in the time of the script', async () => {
        const link = answeringLink((payload) => payload);
        const answer = link.nextAnswer.bind(link);

        link.nextAnswer = async () => {
            // timing-policy: the answer has to come later than the whole time of the script, so
            // only real time shows that the wait is outside the clock of the guest.
            await new Promise((resolve) => setTimeout(resolve, 400));

            return answer();
        };

        expect(await runSource(wasm, `${HOST_SEND}('late')`, 150, { link })).toEqual({
            ok: true,
            value: 'late',
        });
    });

    it('does not wait for a send the script never waits for', async () => {
        const link = answeringLink((payload) => payload);

        expect(await runSource(wasm, `${HOST_SEND}('a'); 'done'`, 1000, { link })).toEqual({
            ok: true,
            value: 'done',
        });
        expect(link.waits).toBe(0);
    });

    it('ends on the error of a script that throws after a send it never waited for', async () => {
        const link = answeringLink((payload) => payload);
        const result = await runSource(wasm, `${HOST_SEND}('a'); throw new Error('late')`, 1000, {
            link,
        });

        expect(result).toMatchObject({ ok: false, error: { message: 'late' } });
    });

    it('keeps waiting through an answer that is for no send', async () => {
        const link = answeringLink((payload) => payload);
        const answers = [{ sendId: '99', reply: 'x' }];
        const real = link.nextAnswer;

        link.nextAnswer = () => {
            const stray = answers.shift();

            return stray === undefined ? real() : Promise.resolve(stray);
        };

        expect(
            await runSource(wasm, `${HOST_SEND}('a').then((reply) => reply)`, 1000, { link }),
        ).toEqual({ ok: true, value: 'a' });
    });

    it('ends as a timeout when the script uses its time after an answer', async () => {
        const link = answeringLink((payload) => payload);
        const result = await runSource(wasm, `${HOST_SEND}('a').then(() => { for (;;) {} })`, 200, {
            link,
        });

        expect(result).toMatchObject({ ok: false, fault: 'timeout' });
    });

    it('comes back as a trap of the instance when main fails to answer', async () => {
        const link = answeringLink((payload) => payload);

        link.nextAnswer = () => Promise.reject(new Error('the port closed'));

        expect(await runSource(wasm, `${HOST_SEND}('a')`, 1000, { link })).toMatchObject({
            ok: false,
            fault: 'trap',
        });
    });
});
