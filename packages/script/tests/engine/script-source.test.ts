import { beforeAll, describe, expect, it } from 'vitest';

import { SCRIPT_FIRST_LINE, scriptSourceOf } from '../../src/engine/script-source.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';
import { inputOf, outputAt } from './guest/support.js';
import { lineOf } from '../support/line-of.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

describe('scriptSourceOf', () => {
    it('puts the script on the line the engine counts from', () => {
        const source = scriptSourceOf(inputOf('SCRIPT_MARK'));

        expect(source.split('\n')[SCRIPT_FIRST_LINE - 1]).toBe('SCRIPT_MARK');
    });

    it('gives the script the objects of its event as parameters, and no other', () => {
        const request = scriptSourceOf(inputOf('x'));
        const message = scriptSourceOf({ ...inputOf('x'), event: 'onMessage' });

        expect(request).toContain(
            'async function (console, atob, btoa, URLSearchParams, vars, test, expect, request, sendRequest)',
        );
        expect(message).toContain('expect, message, socket)');
    });

    it('does not define in a script what its event does not show', async () => {
        const output = await outputAt(
            wasm,
            'onBeforeRequest',
            'console.log(typeof response, typeof message, typeof socket, typeof request);',
        );

        expect(lineOf(output.logs[0])).toBe('undefined undefined undefined object');
    });
});
