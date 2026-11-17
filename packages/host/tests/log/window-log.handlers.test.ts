import { CHANNELS } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { registerWindowLogHandlers } from '../../src/log/window-log.handlers.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

const LINE = { level: 'error', source: 'react-uncaught', message: 'boom' } as const;

let ipc: IpcSpy;
let dispose: () => void;
let logged: [level: string, message: string][];
let clock: number;

beforeEach(() => {
    ipc = spyIpc();
    logged = [];
    clock = 1_000_000;
    dispose = registerWindowLogHandlers(ipc, {
        logger: {
            log: (level, message) => {
                logged.push([level, message]);
            },
            flush: () => Promise.resolve(),
        },
        now: () => clock,
    });
});

afterEach(() => {
    dispose();
});

async function tell(count: number): Promise<void> {
    for (let each = 0; each < count; each += 1) {
        await ipc.call(CHANNELS.logWrite, LINE);
    }
}

describe('the lines the window writes in the log', () => {
    it('writes the origin, the message and the stack, at the level the window gave', async () => {
        const answer = await ipc.call(CHANNELS.logWrite, {
            level: 'warn',
            source: 'unawaited',
            message: 'no answer',
            stack: 'Error: no answer\n    at call',
        });

        expect(answer).toEqual({ ok: true, value: {} });
        expect(logged).toEqual([
            ['warn', 'window unawaited: no answer\nError: no answer\n    at call'],
        ]);
    });

    it('writes no stack line when the fault had none', async () => {
        await ipc.call(CHANNELS.logWrite, LINE);

        expect(logged).toEqual([['error', 'window react-uncaught: boom']]);
    });

    it('refuses what is not a line of the schema, and writes nothing', async () => {
        await expect(
            ipc.call(CHANNELS.logWrite, { ...LINE, level: 'info' }),
        ).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } });
        await expect(ipc.call(CHANNELS.logWrite, 'text')).resolves.toMatchObject({ ok: false });

        expect(logged).toEqual([]);
    });

    it('stops at fifty lines a minute and says how many it dropped when the next minute opens', async () => {
        await tell(53);

        expect(logged).toHaveLength(50);

        clock += 60_000;
        await tell(1);

        expect(logged).toHaveLength(52);
        expect(logged[50]).toEqual(['warn', '3 lines from the window were dropped']);
        expect(logged[51]).toEqual(['error', 'window react-uncaught: boom']);
    });

    it('says nothing about the minute that dropped none', async () => {
        await tell(50);
        clock += 60_000;
        await tell(1);

        expect(logged.filter(([, message]) => message.includes('dropped'))).toEqual([]);
    });

    it('leaves no channel behind when it is undone', () => {
        dispose();

        expect(ipc.registered()).toEqual([]);
    });
});
