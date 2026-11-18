import { beforeAll, describe, expect, it } from 'vitest';

import type { ScriptSnapshot } from '../../../src/contract/script-run.js';
import { SOCKET_GUEST } from '../../../src/engine/guest/socket-guest.js';
import { SCRIPT_LIMITS } from '../../../src/limits/script-limits.js';
import { newWasmModule, type WasmModule } from '../../../src/engine/wasm-module.js';
import { outputAt } from './support.js';
import { lineOf } from '../../support/line-of.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

type Message = NonNullable<ScriptSnapshot['message']>;

const MESSAGE: Message = { text: 'hello', direction: 'incoming', binary: false, event: 'chat' };

async function onMessage(source: string, message: Message = MESSAGE) {
    return await outputAt(wasm, 'onMessage', source, { message });
}

describe('message and socket of the guest', () => {
    it('is plain text with nothing that would break the assembly', () => {
        expect(SOCKET_GUEST).not.toMatch(/`|\$\{/u);
    });

    it('gives the frame as the snapshot has it', async () => {
        const output = await onMessage(
            'console.log(message.text, message.direction, message.binary, message.event);',
        );

        expect(lineOf(output.logs[0])).toBe('hello incoming false chat');
    });

    it('says a write to the frame cannot be made, and keeps the frame as it came', async () => {
        const output = await onMessage('message.text = "other"; console.log(message.text);');

        expect(output.logs).toEqual([
            { level: 'warn', notice: 'message-field-readonly', params: { field: 'message.text' } },
            { level: 'log', text: 'hello' },
        ]);
    });

    it('gives a frame with no text as undefined', async () => {
        const output = await onMessage('console.log(message.text);', {
            direction: 'incoming',
            binary: true,
        });

        expect(lineOf(output.logs[0])).toBe('undefined');
    });

    it('leaves one effect for each send, in order, with the text the console would show', async () => {
        const output = await onMessage('socket.send("a"); socket.send(2); socket.send({ k: 1 });');

        expect(output.effects).toEqual([
            { kind: 'socket', value: 'a' },
            { kind: 'socket', value: '2' },
            { kind: 'socket', value: '{"k":1}' },
        ]);
    });

    it('stops at the sends of one run, and says so once', async () => {
        const over = SCRIPT_LIMITS.socketSendsPerRun + 5;
        const output = await onMessage(
            `for (let i = 0; i < ${String(over)}; i += 1) { socket.send("m" + i); }`,
        );

        expect(output.effects).toHaveLength(SCRIPT_LIMITS.socketSendsPerRun);
        expect(output.logs).toEqual([
            {
                level: 'warn',
                notice: 'socket-sends-cap',
                params: { limit: SCRIPT_LIMITS.socketSendsPerRun },
            },
        ]);
    });
});
