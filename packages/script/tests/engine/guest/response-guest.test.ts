import { beforeAll, describe, expect, it } from 'vitest';

import { RESPONSE_GUEST } from '../../../src/engine/guest/response-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { outputAt } from './support.js';
import { lineOf } from '../../support/line-of.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

const RESPONSE = {
    status: 201,
    headers: [{ name: 'Content-Type', value: 'application/json' }],
    text: '{"id":7}',
    bodyBytes: 8,
    timeMs: 42,
};

async function run(source: string, response: Partial<typeof RESPONSE> = {}) {
    return await outputAt(wasm, 'onResponse', source, { response: { ...RESPONSE, ...response } });
}

describe('response of the guest', () => {
    it('is plain text with nothing that would break the assembly', () => {
        expect(RESPONSE_GUEST).not.toMatch(/`|\$\{/u);
    });

    it('gives the status, the time, the headers and the body', async () => {
        const output = await run(
            'console.log(response.status, response.timeMs, response.headers.get("content-type"), response.headers.has("x"), response.text(), response.json().id);',
        );

        expect(lineOf(output.logs[0])).toBe('201 42 application/json false {"id":7} 7');
    });

    it('has nothing to write: a header or a status stays as it was', async () => {
        const output = await run(
            'response.status = 500; console.log(response.status, typeof response.headers.set);',
        );

        expect(output.effects).toEqual([]);
        expect(lineOf(output.logs[0])).toBe('201 undefined');
    });

    it('fails on a body that is no JSON, as JSON.parse does', async () => {
        const output = await run('response.json();', { text: 'not json' });

        expect(output.error).toMatchObject({ errorName: 'SyntaxError', line: 1 });
    });

    it('gives undefined for a body over the size a script may read, and says so once', async () => {
        const large = {
            status: RESPONSE.status,
            headers: RESPONSE.headers,
            bodyBytes: 9_000_000,
            timeMs: RESPONSE.timeMs,
        };
        const output = await outputAt(
            wasm,
            'onResponse',
            'response.text(); response.json(); console.log(response.text());',
            {
                response: large,
            },
        );

        expect(output.logs).toEqual([
            { level: 'warn', notice: 'response-body-unreadable' },
            { level: 'log', text: 'undefined' },
        ]);
    });

    it('is empty when the snapshot has no response', async () => {
        const output = await outputAt(
            wasm,
            'onResponse',
            'console.log(response.status, response.text());',
        );

        expect(output.logs.map(lineOf)).toEqual([
            { level: 'warn', notice: 'response-body-unreadable' },
            '0 undefined',
        ]);
    });
});
