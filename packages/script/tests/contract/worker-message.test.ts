import { describe, expect, it } from 'vitest';

import { workerMessageSchema } from '../../src/contract/worker-message.js';

describe('workerMessageSchema', () => {
    it.each([
        { kind: 'run', runId: 'r1', input: '"x"' },
        { kind: 'waiting', runId: 'r1' },
        { kind: 'send', runId: 'r1', sendId: 's1', payload: '{}' },
        { kind: 'sent', runId: 'r1', sendId: 's1', reply: '{}' },
        { kind: 'done', runId: 'r1', output: 'text' },
        {
            kind: 'failed',
            runId: 'r1',
            error: { message: 'boom', errorName: 'TypeError', line: 3, column: 9 },
            fault: 'timeout',
        },
        { kind: 'failed', runId: 'r1', error: { message: 'boom', errorName: 'TypeError' } },
    ])('accepts $kind', (message) => {
        expect(workerMessageSchema.safeParse(message).success).toBe(true);
    });

    it.each([
        ['text that is no message', 'run'],
        ['a message of no known kind', { kind: 'hello', runId: 'r1' }],
        ['a run with no runId', { kind: 'run', input: 'x' }],
        ['a run with an empty runId', { kind: 'run', runId: '', input: 'x' }],
        ['a send with no sendId', { kind: 'send', runId: 'r1', payload: '{}' }],
        ['a payload that is no text', { kind: 'send', runId: 'r1', sendId: 's', payload: 7 }],
        [
            'a fault that is none of the three',
            { kind: 'failed', runId: 'r1', error: { message: 'x', errorName: 'E' }, fault: 'sad' },
        ],
        ['an error with no name', { kind: 'failed', runId: 'r1', error: { message: 'x' } }],
        ['a done with no output', { kind: 'done', runId: 'r1' }],
        [
            'a done that also carries an error',
            { kind: 'done', runId: 'r1', output: 'x', error: { message: 'x', errorName: 'E' } },
        ],
        ['a failed with no error', { kind: 'failed', runId: 'r1', fault: 'trap' }],
        ['a key the protocol does not have', { kind: 'waiting', runId: 'r1', extra: 1 }],
        ['a waiting with no runId', { kind: 'waiting' }],
    ])('refuses %s', (_name, message) => {
        expect(workerMessageSchema.safeParse(message).success).toBe(false);
    });
});
