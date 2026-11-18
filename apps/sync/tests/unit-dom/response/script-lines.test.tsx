import { useMessages, useScriptWords } from '@mandor/i18n';
import type { RequestScriptOutput } from '@mandor/ipc';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { consoleLines, testLines } from '../../../src/renderer/response/lib/script-lines.js';
import { AppProviders } from '../support/app-providers.js';

const SEND = '00000000-0000-4000-8000-000000000001';

function labels() {
    return renderHook(() => useMessages('requests'), { wrapper: AppProviders }).result.current;
}

function words() {
    return renderHook(() => useScriptWords(), { wrapper: AppProviders }).result.current;
}

function pushOf(change: Partial<RequestScriptOutput> = {}): RequestScriptOutput {
    return {
        sendId: SEND,
        phase: 'before',
        logs: [],
        tests: [],
        skipped: [],
        imported: 0,
        switchedOff: 0,
        variables: [],
        withheld: [],
        destinationMoved: false,
        ...change,
    };
}

describe('the lines of the cases a script named (testLines)', () => {
    it('says whether each case held, and why it broke when it was told', () => {
        const lines = testLines(
            [
                { name: 'status is 200', passed: true },
                { name: 'has an id', passed: false, message: 'expected 1 to be 2' },
            ],
            labels(),
        );

        expect(lines).toEqual([
            { key: 'test-0', tone: 'passed', text: 'status is 200', detail: 'Passed' },
            {
                key: 'test-1',
                tone: 'failed',
                text: 'has an id',
                detail: 'Failed: expected 1 to be 2',
            },
        ]);
    });
});

describe('what one moment of a send writes to the console (consoleLines)', () => {
    it('writes nothing for a moment whose scripts said nothing', () => {
        expect(consoleLines(pushOf(), labels(), words())).toEqual([]);
    });

    it('says the scripts that did not run, then what the rest wrote, then where one stopped', () => {
        const lines = consoleLines(
            pushOf({
                imported: 1,
                switchedOff: 2,
                logs: [
                    { level: 'log', text: 'antes' },
                    { level: 'warn', text: 'cuidado' },
                    { level: 'warn', notice: 'folder-unreadable', params: { name: 'Broken' } },
                ],
                error: {
                    errorName: 'TypeError',
                    message: 'x is undefined',
                    level: 'request',
                    event: 'onBeforeRequest',
                    line: 3,
                },
            }),
            labels(),
            words(),
        );

        expect(lines).toEqual([
            {
                key: 'before-scriptsImported',
                tone: 'note',
                text: '1 imported script does not run',
            },
            {
                key: 'before-scriptsSwitchedOff',
                tone: 'note',
                text: 'Scripts are off: 2 did not run',
            },
            { key: 'before-log-0', tone: 'log', text: 'antes' },
            { key: 'before-log-1', tone: 'warn', text: 'cuidado' },
            {
                key: 'before-log-2',
                tone: 'warn',
                text: 'The folder Broken could not be read: its scripts did not run.',
            },
            {
                key: 'before-error',
                tone: 'error',
                text: 'TypeError: x is undefined',
                detail: 'Request · Before the request · line 3',
            },
        ]);
    });

    it('keys every line by its moment, so the two moments of a send never collide', () => {
        const said = { logs: [{ level: 'log' as const, text: 'hola' }] };
        const before = consoleLines(pushOf(said), labels(), words());
        const after = consoleLines(pushOf({ ...said, phase: 'response' }), labels(), words());

        expect(before[0]?.key).toBe('before-log-0');
        expect(after[0]?.key).toBe('response-log-0');
    });

    it('leaves out where a script stopped when nothing is known of it', () => {
        const lines = consoleLines(
            pushOf({ error: { errorName: 'Error', message: 'no' } }),
            labels(),
            words(),
        );

        expect(lines).toEqual([
            { key: 'before-error', tone: 'error', text: 'Error: no', detail: undefined },
        ]);
    });

    it('says an error of main in the words of the interface, not in the words main logged', () => {
        const lines = consoleLines(
            pushOf({ error: { errorName: 'Timeout', message: 'ran long', limit: 300 } }),
            labels(),
            words(),
        );

        expect(lines[0]?.text).toBe('The script ran longer than 300 ms');
    });
});
