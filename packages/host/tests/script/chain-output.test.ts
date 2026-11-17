import { afterEach, describe, expect, it } from 'vitest';

import { scriptNotice } from '@mandor/schema';

import { outputOfRun, redactedResult } from '../../src/script/chain-output.js';
import { forgetSessionSecrets, rememberSessionSecrets } from '../../src/secret/session-secrets.js';

const ENTRY = { event: 'onResponse', level: 'folder', name: 'Orders' };

function logger() {
    const lines: [string, string][] = [];

    return {
        lines,
        log: (level: string, message: string) => {
            lines.push([level, message]);
        },
    };
}

afterEach(() => {
    forgetSessionSecrets();
});

describe('outputOfRun', () => {
    it('reads the output a run gave', () => {
        const output = { effects: [{ kind: 'var', name: 'a', value: '1' }], logs: [], tests: [] };

        expect(outputOfRun({ ok: true, output: JSON.stringify(output) }, ENTRY, logger())).toEqual(
            output,
        );
    });

    it('ends on an error of its own when the output cannot be read', () => {
        for (const text of ['not json', JSON.stringify({ effects: 'x' })]) {
            expect(outputOfRun({ ok: true, output: text }, ENTRY, logger()).error).toEqual({
                message: 'The script worker ended on an output that could not be read',
                errorName: 'OutputInvalid',
            });
        }
    });

    it('gives the error of a run that failed, and writes down only a trap of the engine', () => {
        const log = logger();
        const timeout = { message: 'Took too long', errorName: 'Timeout' };
        const trap = { message: 'memory access out of bounds', errorName: 'EngineTrap' };

        expect(outputOfRun({ ok: false, error: timeout }, ENTRY, log).error).toEqual(timeout);
        expect(log.lines).toEqual([]);
        expect(outputOfRun({ ok: false, error: trap }, ENTRY, log).error).toEqual(trap);
        expect(log.lines).toEqual([
            [
                'error',
                'the engine of scripts trapped in onResponse of the folder Orders: memory access out of bounds',
            ],
        ]);
    });
});

describe('redactedResult', () => {
    it('hides every secret of the session in what leaves, and cuts a value short', () => {
        rememberSessionSecrets(['s3cr3t']);

        const result = redactedResult(
            {
                effects: [],
                logs: [
                    { level: 'log', text: 'saw s3cr3t' },
                    scriptNotice('collection-unreadable', { name: 's3cr3t', count: 1 }),
                ],
                tests: [
                    { name: 'has s3cr3t', passed: false, message: 'got s3cr3t' },
                    { name: 'plain', passed: true },
                ],
                skipped: [],
                switchedOff: 0,
                error: { message: 'failed on s3cr3t', errorName: 'Error' },
            },
            { token: 's3cr3t', long: 'x'.repeat(300) },
        );

        expect(JSON.stringify(result)).not.toContain('s3cr3t');
        expect(result.tests[1]).toEqual({ name: 'plain', passed: true });
        expect(result.variables.map(({ name }) => name)).toEqual(['token', 'long']);
        expect(result.variables[1]?.preview).toHaveLength(256);
        expect(result.error?.errorName).toBe('Error');
    });

    it('adds no error to a chain that ended clean', () => {
        const result = redactedResult(
            { effects: [], logs: [], tests: [], skipped: [], switchedOff: 2 },
            {},
        );

        expect(result).toEqual({
            effects: [],
            logs: [],
            tests: [],
            skipped: [],
            switchedOff: 2,
            variables: [],
        });
    });
});
