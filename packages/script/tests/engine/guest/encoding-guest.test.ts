import { beforeAll, describe, expect, it } from 'vitest';

import { runSource } from '../../../src/engine/run-source.js';
import { BASE64_GUEST } from '../../../src/engine/guest/base64-guest.js';
import { ENCODING_GUEST } from '../../../src/engine/guest/encoding-guest.js';
import { SEARCH_PARAMS_GUEST } from '../../../src/engine/guest/search-params-guest.js';
import { UTF8_GUEST } from '../../../src/engine/guest/utf8-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { lineOf, thrownBy } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function line(source: string): Promise<string> {
    return await lineOf(wasm, source);
}

async function throws(source: string): Promise<string> {
    return await thrownBy(wasm, source);
}

describe('encoding of the guest', () => {
    it.each([
        ['the whole', ENCODING_GUEST],
        ['base64', BASE64_GUEST],
        ['utf8', UTF8_GUEST],
        ['search params', SEARCH_PARAMS_GUEST],
    ])('is plain text with nothing that would break the assembly: %s', (_name, guest) => {
        expect(guest).not.toMatch(/`|\$\{/u);
    });

    it.each(['atob', 'btoa', 'URLSearchParams'])(
        'is written because the engine does not bring %s',
        async (name) => {
            expect(await runSource(wasm, `String(typeof ${name})`)).toEqual({
                ok: true,
                value: 'undefined',
            });
        },
    );

    describe('btoa', () => {
        it.each([
            ['', ''],
            ['a', 'YQ=='],
            ['ab', 'YWI='],
            ['abc', 'YWJj'],
            ['hola', 'aG9sYQ=='],
            ['é', '6Q=='],
            ['\\u00ff\\u0000', '/wA='],
        ])('encodes %j', async (text, expected) => {
            expect(await line(`btoa("${text}")`)).toBe(expected);
        });

        it('reads its argument as text', async () => {
            expect(await line('btoa(12)')).toBe('MTI=');
        });

        it('throws when a character is outside Latin-1, wherever it is', async () => {
            for (const text of ['€', 'a€', 'ab€', 'abc€']) {
                expect(await throws(`btoa("${text}")`)).toBe(
                    'InvalidCharacterError: The string to be encoded contains characters outside of the Latin1 range.',
                );
            }
        });
    });

    describe('atob', () => {
        it.each([
            ['', ''],
            ['YQ==', 'a'],
            ['YQ', 'a'],
            ['YWI=', 'ab'],
            ['YWJj', 'abc'],
            ['aG9sYQ==', 'hola'],
            [' aG9s\\nYQ== ', 'hola'],
            ['6Q==', 'é'],
        ])('decodes %j', async (text, expected) => {
            expect(await line(`atob("${text}")`)).toBe(expected);
        });

        it('gives a binary string, one character per byte', async () => {
            expect(
                await line('atob("/wA=").charCodeAt(0) + "," + atob("/wA=").charCodeAt(1)'),
            ).toBe('255,0');
        });

        it.each(['Y', 'YQ=', 'YQ=a', 'Y*Q=', 'YQ===', '=YQ='])('throws on %j', async (text) => {
            expect(await throws(`atob("${text}")`)).toBe(
                'InvalidCharacterError: The string to be decoded is not correctly encoded.',
            );
        });
    });
});
