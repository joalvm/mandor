import { EventEmitter } from 'node:events';

import { describe, expect, it } from 'vitest';

import { watchProcessFaults } from '../../src/runtime/process-faults.js';

type Raised = [code: string, tone: string, params: unknown, key: unknown];

function setup() {
    const target = new EventEmitter();
    const logged: [level: string, message: string][] = [];
    const raised: Raised[] = [];
    const dispose = watchProcessFaults(
        target,
        {
            log: (level, message) => {
                logged.push([level, message]);
            },
            flush: () => Promise.resolve(),
        },
        {
            raise: (code, tone, params, key) => {
                raised.push([code, tone, params, key]);
            },
            list: () => [],
        },
    );

    return { dispose, logged, raised, target };
}

describe('watching the faults of the process', () => {
    it('writes the stack of an uncaught exception and tells the person, once per cause', () => {
        const { logged, raised, target } = setup();
        const error = new Error('thrown on purpose');

        target.emit('uncaughtException', error);
        target.emit('uncaughtException', error);

        expect(logged[0]?.[0]).toBe('error');
        expect(logged[0]?.[1]).toContain('uncaughtException');
        expect(logged[0]?.[1]).toContain(error.stack ?? '');
        expect(raised).toEqual([
            ['main-fault', 'error', undefined, 'main-fault'],
            ['main-fault', 'error', undefined, 'main-fault'],
        ]);
    });

    it('writes a rejection nobody handled, whatever it was rejected with', () => {
        const { logged, raised, target } = setup();

        target.emit('unhandledRejection', 'plain text');

        expect(logged).toEqual([['error', 'unhandledRejection: plain text']]);
        expect(raised).toHaveLength(1);
    });

    it('leaves no listener behind when it is disposed', () => {
        const { dispose, raised, target } = setup();

        dispose();

        expect(target.listenerCount('uncaughtException')).toBe(0);
        expect(target.listenerCount('unhandledRejection')).toBe(0);
        expect(raised).toEqual([]);
    });
});
