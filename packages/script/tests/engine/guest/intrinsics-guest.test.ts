import { beforeAll, describe, expect, it } from 'vitest';

import { INTRINSICS_GUEST } from '../../../src/engine/guest/intrinsics-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { consoleOf, outputOf } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

describe('intrinsics of the guest', () => {
    it('is plain text with nothing that would break the assembly of the source', () => {
        expect(INTRINSICS_GUEST).not.toMatch(/`|\$\{/u);
    });

    it.each([
        ['JSON.stringify', 'JSON.stringify = () => "forged";'],
        ['JSON.parse', 'JSON.parse = () => { throw new Error("forged"); };'],
        ['Array.prototype.push', 'Array.prototype.push = () => { throw new Error("forged"); };'],
        ['Array.prototype.join', 'Array.prototype.join = () => "forged";'],
        ['String.prototype.slice', 'String.prototype.slice = () => "forged";'],
        ['String.prototype.charCodeAt', 'String.prototype.charCodeAt = () => 0;'],
        ['String.prototype.indexOf', 'String.prototype.indexOf = () => -1;'],
        ['RegExp.prototype.exec', 'RegExp.prototype.exec = () => null;'],
        [
            'Promise.prototype.then',
            'Promise.prototype.then = () => { throw new Error("forged"); };',
        ],
        ['Object.create', 'Object.create = () => ({});'],
        ['Object.keys', 'Object.keys = () => [];'],
        ['Function.prototype.call', 'Function.prototype.call = () => "forged";'],
        ['Function.prototype.bind', 'Function.prototype.bind = () => "forged";'],
        ['String', 'globalThis.String = () => "forged";'],
        ['Error', 'globalThis.Error = function () { return {}; };'],
        [
            'Array.prototype[Symbol.iterator]',
            'Array.prototype[Symbol.iterator] = function* () { yield "forged"; };',
        ],
        ['Object.defineProperty', 'Object.defineProperty = () => ({});'],
    ])('keeps the output intact when the script replaces %s', async (_name, override) => {
        const output = await outputOf(
            wasm,
            `${override}\nconsole.log("a", { b: 1 }); mandor.variables.set("k", "v"); console.log(mandor.variables.replaceIn("{{k}}"));`,
        );

        expect(output.logs).toEqual([
            { level: 'log', text: 'a {"b":1}' },
            { level: 'log', text: 'v' },
        ]);
        expect(output.effects).toEqual([{ kind: 'var', name: 'k', value: 'v' }]);
        expect(output).not.toHaveProperty('error');
    });

    it('keeps the error of a throw intact when the script replaces what reads it', async () => {
        const output = await outputOf(
            wasm,
            'String = () => "forged"; JSON.stringify = () => "forged"; throw new RangeError("real");',
        );

        expect(output.error).toMatchObject({ message: 'real', errorName: 'RangeError' });
    });

    it('keeps the encoding of the guest intact when the script replaces String methods', async () => {
        expect(
            await consoleOf(
                wasm,
                'String.prototype.charAt = () => "?"; String.fromCharCode = () => "?"; console.log(btoa("hola"), atob("aG9sYQ=="), new URLSearchParams("a=%C3%A9").get("a"));',
            ),
        ).toEqual(['aG9sYQ== hola é']);
    });
});
