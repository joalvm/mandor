import type { WorkerMessage } from '@mandor/script';
import { describe, expect, it } from 'vitest';

import { newRunProtocol, rulesOf, type RunRules } from '../../src/script/run-protocol.js';

const RUN = 'run-1';
const OPEN: RunRules = { mayAsk: true, maxSends: 2 };

function waiting(runId = RUN): WorkerMessage {
    return { kind: 'waiting', runId };
}

function send(sendId: string, runId = RUN): WorkerMessage {
    return { kind: 'send', runId, sendId, payload: '{}' };
}

function done(runId = RUN): WorkerMessage {
    return { kind: 'done', runId, output: 'text' };
}

function failed(): WorkerMessage {
    return { kind: 'failed', runId: RUN, error: { message: 'boom', errorName: 'Error' } };
}

describe('a run in main', () => {
    it.each([{ end: done() }, { end: failed() }])(
        'takes a $end.kind when the run is going, and ends there',
        ({ end }) => {
            const run = newRunProtocol(RUN, OPEN);

            expect(run.receive(end)).toEqual({ ok: true });
            expect(run.receive(waiting())).toEqual({
                ok: false,
                reason: 'a waiting came after the run was done',
            });
        },
    );

    it('takes a send, a waiting for it, and the done after main answered', () => {
        const run = newRunProtocol(RUN, OPEN);

        expect(run.receive(send('s1'))).toEqual({ ok: true });
        expect(run.pendingSends).toBe(1);
        expect(run.receive(waiting())).toEqual({ ok: true });
        expect(run.deliver('s1')).toEqual({ ok: true });
        expect(run.pendingSends).toBe(0);
        expect(run.receive(done())).toEqual({ ok: true });
    });

    it('takes several sends in flight at once', () => {
        const run = newRunProtocol(RUN, OPEN);

        run.receive(send('s1'));
        run.receive(send('s2'));
        run.deliver('s1');

        expect(run.pendingSends).toBe(1);
    });

    it('refuses a waiting when no send of the guest is in flight', () => {
        const run = newRunProtocol(RUN, OPEN);

        expect(run.receive(waiting())).toEqual({
            ok: false,
            reason: 'the guest waits and made no send to wait for',
        });
    });

    it('takes a waiting that comes after main already answered the send', () => {
        const run = newRunProtocol(RUN, OPEN);

        run.receive(send('s1'));
        run.deliver('s1');

        expect(run.receive(waiting())).toEqual({ ok: true });
        expect(run.pendingSends).toBe(0);
    });

    it('refuses a second waiting for a send that was waited for already', () => {
        const run = newRunProtocol(RUN, OPEN);

        run.receive(send('s1'));
        run.receive(waiting());

        expect(run.receive(waiting()).ok).toBe(false);
    });

    it('refuses a send whose id is already in flight', () => {
        const run = newRunProtocol(RUN, OPEN);

        run.receive(send('s1'));

        expect(run.receive(send('s1')).ok).toBe(false);
    });

    it('takes a send id again once main answered it', () => {
        const run = newRunProtocol(RUN, OPEN);

        run.receive(send('s1'));
        run.deliver('s1');

        expect(run.receive(send('s1')).ok).toBe(true);
    });

    it('takes the start of the script once, and refuses a second one', () => {
        const run = newRunProtocol(RUN, OPEN);

        expect(run.receive({ kind: 'started', runId: RUN }).ok).toBe(true);
        expect(run.receive({ kind: 'started', runId: RUN })).toEqual({
            ok: false,
            reason: 'the worker started the script twice',
        });
    });

    it('refuses what goes the other way: a run or a sent from the worker', () => {
        const run = newRunProtocol(RUN, OPEN);

        expect(run.receive({ kind: 'run', runId: RUN, input: 'x' }).ok).toBe(false);
        expect(run.receive({ kind: 'sent', runId: RUN, sendId: 's', reply: '{}' }).ok).toBe(false);
    });

    it('refuses anything after the done, the same kind or another', () => {
        const run = newRunProtocol(RUN, OPEN);

        run.receive(done());

        expect(run.receive(done()).ok).toBe(false);
        expect(run.receive(send('s1')).ok).toBe(false);
    });

    it('refuses a message of another run', () => {
        const run = newRunProtocol(RUN, OPEN);

        expect(run.receive(done('other'))).toEqual({
            ok: false,
            reason: 'a done of the run other came in the run run-1',
        });
        expect(run.receive(done())).toEqual({ ok: true });
    });

    it('refuses to answer a send the guest does not wait on', () => {
        const run = newRunProtocol(RUN, OPEN);

        expect(run.deliver('nothing').ok).toBe(false);

        run.receive(send('s1'));
        run.deliver('s1');

        expect(run.deliver('s1').ok).toBe(false);
    });
});

describe('what a run may ask of main', () => {
    it('refuses a send when the event gives the script no sendRequest', () => {
        const run = newRunProtocol(RUN, { mayAsk: false, maxSends: 2 });

        expect(run.receive(send('s1'))).toEqual({
            ok: false,
            reason: 'the script asked for a send in an event that has none',
        });
    });

    it('counts every send, and is over the quota from the one that passes it', () => {
        const run = newRunProtocol(RUN, OPEN);

        run.receive(send('s1'));
        run.receive(send('s2'));

        expect(run.overQuota).toBe(false);

        run.receive(send('s3'));

        expect(run.overQuota).toBe(true);
    });
});

describe('the rules of a run', () => {
    it.each([
        ['onBeforeRequest', true],
        ['onResponse', true],
        ['onBeforeConnect', true],
        ['onConnect', true],
        ['onMessage', false],
    ])('say that %s asks: %s', (event, asks) => {
        expect(rulesOf(JSON.stringify({ event })).mayAsk).toBe(asks);
    });

    it.each([
        ['not json'],
        ['{}'],
        ['{"event":7}'],
        ['{"event":"onNothing"}'],
        ['{"event":"toString"}'],
        ['null'],
        ['"onBeforeRequest"'],
    ])('say that an input like %s never asks', (input) => {
        expect(rulesOf(input).mayAsk).toBe(false);
    });

    it('take the quota from the limits of the script', () => {
        expect(rulesOf('{}').maxSends).toBe(10);
    });
});
