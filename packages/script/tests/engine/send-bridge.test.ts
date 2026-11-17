import { beforeAll, describe, expect, it } from 'vitest';

import { HOST_SEND } from '../../src/engine/send-bridge.js';
import { closeSession, newSession, type Session } from '../../src/engine/session.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';

import { answeringLink, type RecordedLink } from './guest/support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

function sessionOver(link: RecordedLink): Session {
    return newSession(wasm, 1000, { link });
}

function run(session: Session, code: string): void {
    session.context.unwrapResult(session.context.evalCode(code)).dispose();
}

// The text a promise of the guest was fulfilled with, read through a global.
function readGlobal(session: Session, name: string): string {
    const handle = session.context.unwrapResult(session.context.evalCode(name));
    const text = session.context.getString(handle);

    handle.dispose();

    return text;
}

describe('newSendBridge', () => {
    it('gives the guest a promise, and main what was sent with an id for each send', () => {
        const link = answeringLink((payload) => payload);
        const session = sessionOver(link);

        run(session, `${HOST_SEND}('a'); ${HOST_SEND}('b');`);

        expect(link.sent).toEqual([
            { sendId: '1', payload: 'a' },
            { sendId: '2', payload: 'b' },
        ]);
        expect(session.bridge?.pending).toBe(2);
        closeSession(session);
    });

    it('settles the promise with the answer, and counts it as no longer pending', async () => {
        const link = answeringLink((payload) => `${payload}!`);
        const session = sessionOver(link);

        run(session, `${HOST_SEND}('a').then((reply) => { globalThis.got = reply; });`);

        expect(await session.bridge?.next()).toBe(true);
        session.runtime.executePendingJobs();
        expect(readGlobal(session, 'globalThis.got')).toBe('a!');
        expect(session.bridge?.pending).toBe(0);
        closeSession(session);
    });

    it('says to main that the guest waits once for each send, not once for each wait', async () => {
        const link = answeringLink((payload) => payload);
        const session = sessionOver(link);

        run(session, `${HOST_SEND}('a'); ${HOST_SEND}('b');`);
        link.nextAnswer = () => Promise.resolve({ sendId: '99', reply: 'x' });
        await session.bridge?.next();
        await session.bridge?.next();
        await session.bridge?.next();

        expect(link.waits).toBe(2);
        closeSession(session);
    });

    it('does not announce when nothing was sent', async () => {
        const link = answeringLink((payload) => payload);
        const session = sessionOver(link);

        link.nextAnswer = () => Promise.resolve({ sendId: '99', reply: 'x' });
        await session.bridge?.next();

        expect(link.waits).toBe(0);
        closeSession(session);
    });

    it('ignores an answer for no send of this run', async () => {
        const link = answeringLink((payload) => payload);
        const session = sessionOver(link);

        run(session, `${HOST_SEND}('a');`);
        link.nextAnswer = () => Promise.resolve({ sendId: '99', reply: 'x' });

        expect(await session.bridge?.next()).toBe(false);
        expect(session.bridge?.pending).toBe(1);
        closeSession(session);
    });

    it('refuses to send what is not text, and sends nothing', () => {
        const link = answeringLink((payload) => payload);
        const session = sessionOver(link);

        run(session, `try { ${HOST_SEND}(5); } catch (e) { globalThis.said = e.message; }`);

        expect(readGlobal(session, 'globalThis.said')).toBe('A send carries text');
        expect(link.sent).toEqual([]);
        closeSession(session);
    });

    it('lets go of the promises nobody answered when the session closes', () => {
        const link = answeringLink((payload) => payload);
        const session = sessionOver(link);

        run(session, `${HOST_SEND}('a');`);

        expect(() => {
            closeSession(session);
        }).not.toThrow();
    });
});
