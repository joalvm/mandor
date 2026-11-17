import { beforeAll, describe, expect, it } from 'vitest';

import { VARS_GUEST } from '../../../src/engine/guest/vars-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { consoleOf, outputOf } from './support.js';
import { lineOf } from '../../support/line-of.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

const SNAPSHOT = {
    variables: [
        { name: 'host', value: 'example.com' },
        { name: 'empty', value: '' },
        { name: 'token', withheld: true as const },
    ],
};

async function lines(source: string): Promise<string[]> {
    return await consoleOf(wasm, source, SNAPSHOT);
}

describe('vars of the guest', () => {
    it('is plain text with nothing that would break the assembly of the source', () => {
        expect(VARS_GUEST).not.toMatch(/`|\$\{/u);
    });

    describe('get and has', () => {
        it('gives the value of a variable of the snapshot, empty included', async () => {
            expect(
                await lines('console.log(vars.get("host"), "|" + vars.get("empty") + "|");'),
            ).toEqual(['example.com ||']);
        });

        it('gives undefined for what is not there, and false for has', async () => {
            expect(
                await lines(
                    'console.log(String(vars.get("nope")), vars.has("nope"), vars.has("host"));',
                ),
            ).toEqual(['undefined false true']);
        });

        it('does not find a name that an object would have', async () => {
            expect(
                await lines(
                    'console.log(String(vars.get("constructor")), vars.has("toString"), vars.has("__proto__"));',
                ),
            ).toEqual(['undefined false false']);
        });

        it('gives undefined for a secret with one line in the console, and true for has', async () => {
            const output = await outputOf(
                wasm,
                'console.log(String(vars.get("token")), String(vars.get("token")), vars.has("token"));',
                SNAPSHOT,
            );

            expect(output.logs).toEqual([
                { level: 'warn', notice: 'secret-unreadable', params: { name: 'token' } },
                { level: 'log', text: 'undefined undefined true' },
            ]);
        });

        it('reads the name as text', async () => {
            expect(await lines('console.log(vars.get({ toString: () => "host" }));')).toEqual([
                'example.com',
            ]);
        });
    });

    describe('set', () => {
        it('writes an effect and shows the value to the next get', async () => {
            const output = await outputOf(
                wasm,
                'vars.set("host", "other"); console.log(vars.get("host"), vars.has("host"));',
                SNAPSHOT,
            );

            expect(output.effects).toEqual([{ kind: 'var', name: 'host', value: 'other' }]);
            expect(lineOf(output.logs[0])).toBe('other true');
        });

        it('keeps one effect for a name written twice, with the last value, in the first place', async () => {
            const output = await outputOf(
                wasm,
                'vars.set("a", "1"); vars.set("b", "2"); vars.set("a", "3");',
            );

            expect(output.effects).toEqual([
                { kind: 'var', name: 'a', value: '3' },
                { kind: 'var', name: 'b', value: '2' },
            ]);
        });

        it('writes a value that is no string as the console would show it', async () => {
            const output = await outputOf(
                wasm,
                'vars.set("n", 1); vars.set("o", { a: 1 }); vars.set("u", undefined);',
            );

            expect(output.effects.map((effect) => ('value' in effect ? effect.value : ''))).toEqual(
                ['1', '{"a":1}', 'undefined'],
            );
        });

        it('lets a script read what it wrote over a secret', async () => {
            expect(
                await lines('vars.set("token", "mine"); console.log(vars.get("token"));'),
            ).toEqual(['mine']);
        });

        it('writes the names that would reach a prototype as ordinary names, for main to refuse', async () => {
            const output = await outputOf(
                wasm,
                'vars.set("__proto__", "x"); vars.set("constructor", "y"); console.log(vars.get("__proto__"));',
            );

            expect(output.effects).toEqual([
                { kind: 'var', name: '__proto__', value: 'x' },
                { kind: 'var', name: 'constructor', value: 'y' },
            ]);
            expect(lineOf(output.logs[0])).toBe('x');
        });
    });

    describe('replaceIn', () => {
        it.each([
            ['replaces a variable', '"https://{{host}}/a"', 'https://example.com/a'],
            ['replaces an empty one', '"[{{empty}}]"', '[]'],
            ['replaces every occurrence', '"{{host}}-{{host}}"', 'example.com-example.com'],
            ['leaves an unknown one as it is', '"{{nope}}"', '{{nope}}'],
            ['leaves a secret as it is', '"{{token}}"', '{{token}}'],
            ['leaves a dynamic name as it is', '"{{$guid}}"', '{{$guid}}'],
            ['takes the escape off a literal', '"\\\\{{host}}"', '{{host}}'],
            ['does not match a name with spaces', '"{{ host }}"', '{{ host }}'],
            ['does not match an unclosed one', '"{{host"', '{{host'],
            ['does not match an empty name', '"{{}}"', '{{}}'],
            ['finds the one inside extra braces', '"{{{host}}}"', '{example.com}'],
            ['keeps what is around', '"a {{host}} b {{nope}} c"', 'a example.com b {{nope}} c'],
        ])('%s', async (_name, source, expected) => {
            expect(await lines(`console.log(vars.replaceIn(${source}));`)).toEqual([expected]);
        });

        it('reads its argument as text', async () => {
            expect(
                await lines('console.log(vars.replaceIn(12), vars.replaceIn(undefined));'),
            ).toEqual(['12 undefined']);
        });

        it('sees what the script set before', async () => {
            expect(
                await lines('vars.set("host", "new"); console.log(vars.replaceIn("{{host}}"));'),
            ).toEqual(['new']);
        });

        it('does not write an effect', async () => {
            expect((await outputOf(wasm, 'vars.replaceIn("{{host}}");', SNAPSHOT)).effects).toEqual(
                [],
            );
        });
    });
});
