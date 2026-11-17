import { beforeAll, describe, expect, it } from 'vitest';

import { DESCRIBE_THROWN, FRAME_GUEST } from '../../../src/engine/guest/frame-guest.js';
import { runSource } from '../../../src/engine/run-source.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

async function described(thrown: string): Promise<unknown> {
    const result = await runSource(wasm, `${DESCRIBE_THROWN}(${thrown})`);

    return result.ok ? JSON.parse(result.value) : result;
}

describe('guests of the frame', () => {
    it.each([
        ['FRAME_GUEST', FRAME_GUEST],
        ['DESCRIBE_THROWN', DESCRIBE_THROWN],
    ])('%s is plain text with nothing that would break the assembly', (_name, guest) => {
        expect(guest).not.toMatch(/`|\$\{/u);
    });
});

describe('DESCRIBE_THROWN', () => {
    it('describes an error by its name, message and a stack, as one JSON text', async () => {
        expect(await described('new RangeError("out")')).toEqual({
            name: 'RangeError',
            message: 'out',
            stack: expect.any(String) as string,
        });
    });

    it.each([
        ['a number', '7', '7'],
        ['null', 'null', 'null'],
        ['undefined', 'undefined', 'undefined'],
    ])('describes %s by its text, with no stack', async (_name, thrown, message) => {
        expect(await described(thrown)).toEqual({ name: 'Error', message, stack: '' });
    });

    it('keeps its own String and JSON.stringify against a script that replaces them', async () => {
        const forged = 'String = () => "forged"; JSON.stringify = () => "forged";';
        const result = await runSource(
            wasm,
            `const describeIt = ${DESCRIBE_THROWN}; ${forged} describeIt(3)`,
        );

        expect(result.ok ? JSON.parse(result.value) : result).toEqual({
            name: 'Error',
            message: '3',
            stack: '',
        });
    });

    it('describes a value whose fields throw when read as the error that could not be read', async () => {
        expect(await described('{ get name() { throw new Error("no"); } }')).toEqual({
            name: 'ErrorUnreadable',
            message: 'The error could not be read',
            stack: '',
        });
    });
});
