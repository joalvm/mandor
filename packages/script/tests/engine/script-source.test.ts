import { beforeAll, describe, expect, it } from 'vitest';

import { SCRIPT_FIRST_LINE, scriptSourceOf } from '../../src/engine/script-source.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';
import { runScript } from '../../src/engine/run-script.js';
import { answeringLink, inputOf, linkedOutput, okReply, outputAt } from './guest/support.js';
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

    it('gives the script the names of JavaScript and mandor as parameters, and no other', () => {
        expect(scriptSourceOf(inputOf('x'))).toContain(
            'async function (console, atob, btoa, URLSearchParams, mandor)',
        );
    });

    it('does not put in mandor what its event does not show', async () => {
        const output = await outputAt(
            wasm,
            'onBeforeRequest',
            'console.log(typeof mandor.response, typeof mandor.message, typeof mandor.socket, typeof mandor.request);',
        );

        expect(lineOf(output.logs[0])).toBe('undefined undefined undefined object');
    });

    it('lets a script after the response declare response with what sendRequest gives back', async () => {
        const link = answeringLink(() => okReply('done', 201));
        const output = await linkedOutput(
            wasm,
            link,
            'const response = await mandor.sendRequest({ url: "https://example.com" });\nconsole.log(response.status, mandor.response.status);',
            'onResponse',
        );

        expect(output.logs.map(lineOf)).toEqual(['201 0']);
    });

    it('lets a script declare a mandor of its own: it shadows', async () => {
        const output = await outputAt(
            wasm,
            'onBeforeRequest',
            'const mandor = 1;\nconsole.log(mandor + 1);',
        );

        expect(lineOf(output.logs[0])).toBe('2');
    });

    it('reports an error of the first line of the script on line 1', async () => {
        const result = await runScript(wasm, inputOf('throw new Error("first");\nconsole.log(1);'));

        expect(result.ok && result.output.error?.line).toBe(1);
    });
});
