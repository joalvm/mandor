import { beforeAll, describe, expect, it } from 'vitest';

import { CONSOLE_GUEST } from '../../../src/engine/guest/console-guest.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { SCRIPT_LIMITS } from '../../../src/limits/script-limits.js';
import { consoleOf, outputOf } from './support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function line(source: string): Promise<string> {
    return (await consoleOf(wasm, `console.log(${source});`))[0] ?? '';
}

describe('console of the guest', () => {
    it('is plain text with nothing that would break the assembly of the source', () => {
        expect(CONSOLE_GUEST).not.toMatch(/`|\$\{/u);
    });

    it('writes each level as a line of that level', async () => {
        const output = await outputOf(
            wasm,
            'console.log("a"); console.info("b"); console.warn("c"); console.error("d");',
        );

        expect(output.logs).toEqual([
            { level: 'log', text: 'a' },
            { level: 'info', text: 'b' },
            { level: 'warn', text: 'c' },
            { level: 'error', text: 'd' },
        ]);
    });

    it('joins its arguments with a space and gives none as an empty line', async () => {
        expect(await line('"a", 1, true')).toBe('a 1 true');
        expect(await line('')).toBe('');
    });

    it.each([
        ['a string', '"hola"', 'hola'],
        ['a number', '1.5', '1.5'],
        ['null', 'null', 'null'],
        ['undefined', 'undefined', 'undefined'],
        ['a big integer', '10n', '10'],
        ['a symbol', 'Symbol("s")', 'Symbol(s)'],
        ['an array', '[1, "a", [2]]', '[1,"a",[2]]'],
        ['an object', '{ a: 1, b: { c: "d" } }', '{"a":1,"b":{"c":"d"}}'],
        ['a function', '(function named() {})', 'function named() {}'],
        ['an error', 'new TypeError("bad")', 'TypeError: bad'],
        ['an object with toJSON', '{ toJSON() { return "json"; } }', '"json"'],
    ])('shows %s', async (_name, source, text) => {
        expect(await line(source)).toBe(text);
    });

    it('marks a cycle and not a repeated reference', async () => {
        expect(await line('(() => { const a = { n: 1 }; a.self = a; return a; })()')).toBe(
            '{"n":1,"self":"[Circular]"}',
        );
        expect(await line('(() => { const a = { n: 1 }; return [a, a, { a }]; })()')).toBe(
            '[{"n":1},{"n":1},{"a":{"n":1}}]',
        );
    });

    it('shows an object that cannot become JSON by its text, and one with no text as unprintable', async () => {
        expect(await line('{ n: 1n }')).toBe('[object Object]');
        expect(await line('{ toJSON() { throw 1; }, toString() { throw 2; } }')).toBe(
            '[unprintable]',
        );
    });

    it('cuts a line past the limit and marks the cut', async () => {
        const text = await line(`"x".repeat(${String(SCRIPT_LIMITS.lineBytes + 10)})`);

        expect(text).toBe(`${'x'.repeat(SCRIPT_LIMITS.lineBytes)}…[cut]`);
    });

    it('leaves a line that fits as it is', async () => {
        const text = await line(`"x".repeat(${String(SCRIPT_LIMITS.lineBytes)})`);

        expect(text).toBe('x'.repeat(SCRIPT_LIMITS.lineBytes));
    });

    it('works when its methods are taken apart from the console', async () => {
        expect(await consoleOf(wasm, 'const { log } = console; log("detached");')).toEqual([
            'detached',
        ]);
    });
});
