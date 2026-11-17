import {
    failure,
    LOG_MESSAGE_MAX,
    LOG_STACK_MAX,
    type LogWriteRequest,
    type Result,
    success,
} from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reportFault } from '../../src/fault/report-fault.js';

type Mandor = { mandor: FakeBridge };

let written: LogWriteRequest[];
let said: unknown[][];

/** What the bridge answers to a line; the console is where the window says a line was lost. */
function answerWith(answer: () => Promise<Result<Record<string, never>>>): void {
    (window as unknown as Mandor).mandor.log.write = (input) => {
        written.push(input);

        return answer();
    };
}

beforeEach(() => {
    written = [];
    said = [];
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        said.push(args);
    });
    answerWith(() => Promise.resolve(success({})));
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('a fault of the window handed to main for the log', () => {
    it('sends an Error as its message and its stack, under the source it was seen from', () => {
        const error = new Error('no se pudo pintar');

        reportFault('react-uncaught', error);

        expect(written).toEqual([
            {
                level: 'error',
                source: 'react-uncaught',
                message: 'no se pudo pintar',
                stack: error.stack,
            },
        ]);
    });

    it('names an Error that has no message by its kind', () => {
        reportFault('window-error', new TypeError(''));

        expect(written[0]?.message).toBe('TypeError');
    });

    it('sends a rejection with a string as its message and nothing else', () => {
        reportFault('unhandled-rejection', 'se cayó');

        expect(written).toEqual([
            { level: 'error', source: 'unhandled-rejection', message: 'se cayó' },
        ]);
    });

    it('writes an object as JSON, and one that cannot be written as what it prints', () => {
        const circular: Record<string, unknown> = {};

        circular['self'] = circular;
        reportFault('unawaited', { code: 7 });
        reportFault('unawaited', circular);

        expect(written.map((line) => line.message)).toEqual(['{"code":7}', '[object Object]']);
    });

    it('tells the ones React recovered from as warnings, and adds the components it crossed', () => {
        reportFault('react-recoverable', new Error('hydration'), '\n    at Tab');

        expect(written[0]).toMatchObject({ level: 'warn' });
        expect(written[0]?.stack).toMatch(/\n {4}at Tab$/);
    });

    it('cuts the message and the stack to the ceilings main accepts', () => {
        const error = new Error('x'.repeat(LOG_MESSAGE_MAX + 100));

        error.stack = 'y'.repeat(LOG_STACK_MAX + 100);
        reportFault('react-uncaught', error);

        expect(written[0]?.message).toHaveLength(LOG_MESSAGE_MAX);
        expect(written[0]?.stack).toHaveLength(LOG_STACK_MAX);
    });

    it('says in the console that a line was lost when main refuses it', async () => {
        answerWith(() => Promise.resolve(failure('bad-request', 'too long')));
        reportFault('unawaited', new Error('boom'));
        await vi.waitFor(() => {
            expect(said).toHaveLength(1);
        });

        expect(said[0]?.[0]).toBe('a fault of the window could not be written in the log');
    });

    it('says in the console that a line was lost when the bridge itself fails', async () => {
        answerWith(() => Promise.reject(new Error('sin puente')));
        reportFault('unawaited', new Error('boom'));
        await vi.waitFor(() => {
            expect(said).toHaveLength(1);
        });

        expect(said[0]?.[1]).toBeInstanceOf(Error);
    });
});
