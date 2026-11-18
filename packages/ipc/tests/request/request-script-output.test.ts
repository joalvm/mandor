import { describe, expect, it } from 'vitest';

import { requestScriptOutputSchema } from '../../src/index.js';

const push = {
    sendId: '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11',
    phase: 'before',
    logs: [{ level: 'log', text: 'hi' }],
    tests: [{ name: 'is 200', passed: true }],
    skipped: [],
    imported: 1,
    switchedOff: 0,
    variables: [{ name: 'token', preview: 'abc' }],
    withheld: ['apiKey'],
    destinationMoved: false,
};

describe('the push of request:script-output', () => {
    it('carries what the scripts of one phase of a send said', () => {
        expect(requestScriptOutputSchema.parse(push)).toEqual(push);
    });

    it('carries the error that ended a chain and where a redirect stopped', () => {
        const failed = {
            ...push,
            phase: 'response',
            heldAt: 'https://other.test/next',
            error: { message: 'no token', errorName: 'Error', level: 'request', name: 'List' },
        };

        expect(requestScriptOutputSchema.parse(failed)).toEqual(failed);
    });

    it('refuses a phase that is not one of a send', () => {
        expect(requestScriptOutputSchema.safeParse({ ...push, phase: 'onMessage' }).success).toBe(
            false,
        );
    });

    it('refuses a preview longer than the window shows', () => {
        const long = { ...push, variables: [{ name: 'big', preview: 'x'.repeat(257) }] };

        expect(requestScriptOutputSchema.safeParse(long).success).toBe(false);
    });

    it('refuses a push of no send and a field it does not know', () => {
        expect(requestScriptOutputSchema.safeParse({ ...push, sendId: 'x' }).success).toBe(false);
        expect(requestScriptOutputSchema.safeParse({ ...push, extra: 1 }).success).toBe(false);
    });
});
