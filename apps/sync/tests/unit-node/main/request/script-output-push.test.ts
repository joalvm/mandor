import { describe, expect, it } from 'vitest';

import { scriptOutputPush } from '../../../../src/main/request/script-output-push.js';

const AT = { sendId: '5b3c9b0e-6f0b-4b6a-9c1e-0c9c4f2d7a11', phase: 'before' } as const;

const GUARDED = {
    influenced: true,
    destinationMoved: true,
    withheld: ['token'],
    headers: ['X-Mine'],
    bodySecret: false,
    spellings: ['s3cr3t'],
};

describe('scriptOutputPush', () => {
    it('says the marks of a send whose scripts did not run', () => {
        expect(scriptOutputPush(AT, undefined, {})).toEqual({
            ...AT,
            logs: [],
            tests: [],
            skipped: [],
            switchedOff: 0,
            variables: [],
            withheld: [],
            destinationMoved: false,
        });
    });

    it('carries what the scripts said, the error that ended them and the marks of the guard', () => {
        const error = { message: 'no token', errorName: 'Error', level: 'request', name: 'List' };
        const output = {
            effects: [{ kind: 'var' as const, name: 'page', value: '2' }],
            logs: [{ level: 'log' as const, text: 'hi' }],
            tests: [{ name: 'ok', passed: true }],
            skipped: [],
            switchedOff: 0,
            variables: [{ name: 'page', preview: '2' }],
            error,
        };
        const push = scriptOutputPush(AT, output, {
            guarded: GUARDED,
            heldAt: 'https://b.test/next',
        });

        expect(push).toEqual({
            ...AT,
            logs: output.logs,
            tests: output.tests,
            skipped: [],
            switchedOff: 0,
            variables: output.variables,
            withheld: ['token'],
            destinationMoved: true,
            heldAt: 'https://b.test/next',
            error,
        });
        expect(push).not.toHaveProperty('effects');
        expect(push).not.toHaveProperty('spellings');
    });
});
