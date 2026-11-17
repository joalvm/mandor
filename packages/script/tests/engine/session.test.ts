import { beforeAll, describe, expect, it } from 'vitest';

import { closeSession, isPending, newSession } from '../../src/engine/session.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

// What `isPending` answers for the value of `code`, with every handle let go: the runtime would
// abort on close if one were left.
function pendingFor(code: string): boolean {
    const session = newSession(wasm, 1000, {});
    const handle = session.context.unwrapResult(session.context.evalCode(code));
    const pending = isPending(session.context, handle);

    handle.dispose();
    closeSession(session);

    return pending;
}

describe('isPending', () => {
    it('is true for a promise nothing has settled', () => {
        expect(pendingFor('new Promise(() => {})')).toBe(true);
    });

    it('is false for a fulfilled promise', () => {
        expect(pendingFor("Promise.resolve('a')")).toBe(false);
    });

    it('is false for a rejected promise', () => {
        expect(pendingFor("Promise.reject(new Error('a'))")).toBe(false);
    });

    it('is false for a value that is no promise', () => {
        expect(pendingFor('1')).toBe(false);
    });
});
