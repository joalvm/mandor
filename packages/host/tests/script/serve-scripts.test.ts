import { EventEmitter } from 'node:events';

import {
    SCRIPT_LIMITS,
    type ScriptRunInput,
    type ScriptRunOutput,
    type WorkerMessage,
} from '@mandor/script';
import type { Engine } from '@mandor/script/engine';
import { describe, expect, it, vi } from 'vitest';

import { serveScripts, type ScriptPort } from '../../src/script/serve-scripts.js';

// `posted` leaves out the `started` that begins each run; `all` keeps it.
function newPort() {
    const events = new EventEmitter();
    const all: WorkerMessage[] = [];
    const posted: WorkerMessage[] = [];
    const port: ScriptPort = {
        on: (event, listener) => events.on(event, listener),
        postMessage: (message) => {
            all.push(message);

            if (message.kind !== 'started') {
                posted.push(message);
            }
        },
    };

    return { port, all, posted, receive: (value: unknown) => events.emit('message', value) };
}

function engineOf(runScript: Engine['runScript']): Promise<Engine> {
    return Promise.resolve({ runScript });
}

const EMPTY: ScriptRunOutput = { effects: [], logs: [], tests: [] };

/** A result that ends well with an output that holds only one line of console. */
function saying(text: string): ReturnType<Engine['runScript']> {
    return Promise.resolve({ ok: true, output: { ...EMPTY, logs: [{ level: 'log', text }] } });
}

const INPUT: ScriptRunInput = {
    event: 'onBeforeRequest',
    source: 'console.log(1)',
    snapshot: { variables: [], info: { event: 'onBeforeRequest', name: 'a request' } },
};

const RUN = { kind: 'run', runId: 'r1', input: JSON.stringify(INPUT) } as const;

describe('serveScripts', () => {
    it('does nothing when there is no parent to answer', () => {
        expect(() => {
            serveScripts({ port: null });
        }).not.toThrow();
    });

    it('answers a run with the output the engine gave, as JSON text', async () => {
        const { port, posted, receive } = newPort();

        serveScripts({ port, engine: engineOf(() => saying('out')) });
        receive(RUN);

        await expect
            .poll(() => posted)
            .toEqual([
                {
                    kind: 'done',
                    runId: 'r1',
                    output: JSON.stringify({ ...EMPTY, logs: [{ level: 'log', text: 'out' }] }),
                },
            ]);
    });

    it('begins each run with a started, once the engine is made', async () => {
        const { port, all, receive } = newPort();

        serveScripts({ port, engine: engineOf(() => saying('out')) });
        receive(RUN);

        await expect.poll(() => all).toHaveLength(2);
        expect(all.map(({ kind }) => kind)).toEqual(['started', 'done']);
        expect(all[0]).toEqual({ kind: 'started', runId: 'r1' });
    });

    it('hands the input to the engine as the object it was written from', async () => {
        const { port, posted, receive } = newPort();
        const run = vi.fn<Engine['runScript']>(() => Promise.resolve({ ok: true, output: EMPTY }));

        serveScripts({ port, engine: engineOf(run) });
        receive(RUN);

        await expect.poll(() => posted).toHaveLength(1);
        expect(run.mock.calls[0]?.[0]).toEqual(INPUT);
        expect(run.mock.calls[0]?.[1]).toBeDefined();
    });

    it.each([
        ['text that is no JSON', 'source'],
        ['JSON that is no input', '{"event":"nope"}'],
        ['an input with a field more', JSON.stringify({ ...INPUT, extra: 1 })],
    ])(
        'answers %s with an error, without running anything and without ending the thread',
        async (_name, input) => {
            const { port, posted, receive } = newPort();
            const exit = vi.fn();
            const run = vi.fn<Engine['runScript']>(() =>
                Promise.resolve({ ok: true, output: EMPTY }),
            );

            serveScripts({ port, exit, engine: engineOf(run) });
            receive({ ...RUN, input });

            await expect.poll(() => posted).toHaveLength(1);
            expect(posted[0]).toMatchObject({
                kind: 'failed',
                error: { errorName: 'InvalidInput' },
            });
            expect(posted[0]).not.toHaveProperty('output');
            expect(run).not.toHaveBeenCalled();
            expect(exit).not.toHaveBeenCalled();
        },
    );

    it('answers a fault with its error and ends the thread', async () => {
        const { port, posted, receive } = newPort();
        const exit = vi.fn();
        const error = { message: 'too long', errorName: 'Timeout' };

        serveScripts({
            port,
            exit,
            engine: engineOf(() => Promise.resolve({ ok: false, error, fault: 'timeout' })),
        });
        receive(RUN);

        await expect
            .poll(() => posted)
            .toEqual([{ kind: 'failed', runId: 'r1', error, fault: 'timeout' }]);
        expect(exit).toHaveBeenCalledTimes(1);
    });

    it('answers with an error, and does not send it, when the output passes the limit', async () => {
        const { port, posted, receive } = newPort();
        // 3 bytes per character: fewer characters than the limit, more bytes.
        const text = '€'.repeat(Math.ceil(SCRIPT_LIMITS.outputBytes / 3) + 1);

        expect(text.length).toBeLessThan(SCRIPT_LIMITS.outputBytes);

        serveScripts({ port, engine: engineOf(() => saying(text)) });
        receive(RUN);

        await expect.poll(() => posted).toHaveLength(1);
        expect(posted[0]).toMatchObject({ kind: 'failed', error: { errorName: 'OutputTooLarge' } });
        expect(posted[0]).not.toHaveProperty('output');
    });

    it('takes an output of exactly the limit in bytes', async () => {
        const { port, posted, receive } = newPort();
        const bare = Buffer.byteLength(
            JSON.stringify({ ...EMPTY, logs: [{ level: 'log', text: '' }] }),
        );
        const text = 'x'.repeat(SCRIPT_LIMITS.outputBytes - bare);

        serveScripts({ port, engine: engineOf(() => saying(text)) });
        receive(RUN);

        await expect.poll(() => posted).toHaveLength(1);
        expect(posted[0]).toHaveProperty('output');
        expect(Buffer.byteLength((posted[0] as { output: string }).output)).toBe(
            SCRIPT_LIMITS.outputBytes,
        );
    });

    it('answers a trap with a fault and ends the thread when the engine fails to start', async () => {
        const { port, posted, receive } = newPort();
        const exit = vi.fn();

        serveScripts({ port, exit, engine: Promise.reject(new Error('no wasm')) });
        receive(RUN);

        await expect.poll(() => posted).toHaveLength(1);
        expect(posted[0]).toMatchObject({
            kind: 'failed',
            runId: 'r1',
            fault: 'trap',
            error: { errorName: 'EngineTrap', message: 'Error: no wasm' },
        });
        expect(exit).toHaveBeenCalledTimes(1);
    });

    it('ignores what is not of the protocol, and a sent for a run that is over', async () => {
        const { port, posted, receive } = newPort();
        const run = vi.fn<Engine['runScript']>(() => Promise.resolve({ ok: true, output: EMPTY }));

        serveScripts({ port, engine: engineOf(run) });
        receive('garbage');
        receive({ kind: 'run', runId: '' });
        receive({ kind: 'sent', runId: 'r0', sendId: 's', reply: '{}' });
        receive(RUN);

        await expect.poll(() => posted).toHaveLength(1);
        expect(run).toHaveBeenCalledTimes(1);
    });

    it('runs the scripts one after another over the same engine', async () => {
        const { port, posted, receive } = newPort();
        let count = 0;

        serveScripts({
            port,
            engine: engineOf(() => {
                count += 1;

                return saying(String(count));
            }),
        });
        receive(RUN);
        receive({ ...RUN, runId: 'r2' });

        await expect.poll(() => posted).toHaveLength(2);
        expect(
            posted.map(
                (message) =>
                    message.kind === 'done' &&
                    (JSON.parse(message.output) as ScriptRunOutput).logs[0],
            ),
        ).toEqual([
            { level: 'log', text: '1' },
            { level: 'log', text: '2' },
        ]);
    });
    it('gives the engine a link to main, and the sent main answers with reaches it', async () => {
        const { port, posted, receive } = newPort();
        let reply = '';

        serveScripts({
            port,
            engine: engineOf(async (_input, link) => {
                link?.send('s1', 'ask');
                link?.waiting();
                reply = (await link?.nextAnswer())?.reply ?? '';

                return saying(reply);
            }),
        });
        receive(RUN);

        await expect.poll(() => posted).toHaveLength(2);
        expect(posted.slice(0, 2)).toEqual([
            { kind: 'send', runId: 'r1', sendId: 's1', payload: 'ask' },
            { kind: 'waiting', runId: 'r1' },
        ]);

        receive({ kind: 'sent', runId: 'r1', sendId: 's1', reply: 'answer' });

        await expect.poll(() => posted).toHaveLength(3);
        expect(reply).toBe('answer');
        expect(posted[2]).toMatchObject({ kind: 'done', runId: 'r1' });
    });

    it('does not give a sent to a run that is not the one it names', async () => {
        const { port, posted, receive } = newPort();
        const seen: string[] = [];

        serveScripts({
            port,
            engine: engineOf(async (_input, link) => {
                link?.send('s1', 'ask');
                seen.push((await link?.nextAnswer())?.reply ?? '');

                return saying('ok');
            }),
        });
        receive(RUN);
        await expect.poll(() => posted).toHaveLength(1);
        receive({ kind: 'sent', runId: 'other', sendId: 's1', reply: 'wrong' });
        receive({ kind: 'sent', runId: 'r1', sendId: 's1', reply: 'right' });

        await expect.poll(() => posted).toHaveLength(2);
        expect(seen).toEqual(['right']);
    });
});
