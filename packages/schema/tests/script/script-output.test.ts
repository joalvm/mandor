import { describe, expect, it } from 'vitest';

import {
    chainLogSchema,
    scriptErrorSchema,
    scriptLogSchema,
    scriptNotice,
    scriptNoticeSchema,
    scriptTestSchema,
    skippedScriptSchema,
} from '../../src/script/script-output.js';

describe('the output of a script', () => {
    it('reads a line of the console with its level', () => {
        expect(scriptLogSchema.parse({ level: 'warn', text: 'ojo' })).toEqual({
            level: 'warn',
            text: 'ojo',
        });
        expect(scriptLogSchema.safeParse({ level: 'trace', text: 'x' }).success).toBe(false);
    });

    it('reads a test that passed and one that failed with its reason', () => {
        expect(scriptTestSchema.parse({ name: 'status', passed: true })).toEqual({
            name: 'status',
            passed: true,
        });
        expect(
            scriptTestSchema.parse({ name: 'status', passed: false, message: 'esperaba 200' }),
        ).toEqual({ name: 'status', passed: false, message: 'esperaba 200' });
        expect(scriptTestSchema.safeParse({ name: 'status' }).success).toBe(false);
    });

    it('reads the error of a script with the place only when it is known', () => {
        expect(scriptErrorSchema.parse({ message: 'boom', errorName: 'Error' })).toEqual({
            message: 'boom',
            errorName: 'Error',
        });
        expect(
            scriptErrorSchema.parse({
                message: 'boom',
                errorName: 'TypeError',
                line: 3,
                column: 5,
                level: 'Pagos',
                event: 'onResponse',
                name: 'Cobrar',
            }),
        ).toMatchObject({
            line: 3,
            column: 5,
            level: 'Pagos',
            event: 'onResponse',
            name: 'Cobrar',
        });
        expect(
            scriptErrorSchema.parse({ message: 'slow', errorName: 'Timeout', limit: 300 }),
        ).toEqual({ message: 'slow', errorName: 'Timeout', limit: 300 });
        expect(
            scriptErrorSchema.safeParse({ message: 'slow', errorName: 'Timeout', limit: -1 })
                .success,
        ).toBe(false);
        expect(scriptErrorSchema.safeParse({ message: 'boom' }).success).toBe(false);
        expect(
            scriptErrorSchema.safeParse({ message: 'b', errorName: 'E', line: 1.5 }).success,
        ).toBe(false);
    });

    it('reads a script that was left out, with its text only when it came', () => {
        const left = { name: 'Pagos', level: 'folder', event: 'onResponse', bytes: 40 };

        expect(skippedScriptSchema.parse(left)).toEqual(left);
        expect(skippedScriptSchema.parse({ ...left, source: 'a()' })).toEqual({
            ...left,
            source: 'a()',
        });
        expect(skippedScriptSchema.safeParse({ ...left, bytes: -1 }).success).toBe(false);
    });
});

describe('what main says in the console in place of a script', () => {
    it('is a code with what it is said with, never a sentence', () => {
        expect(scriptNotice('no-reconnect')).toEqual({ level: 'warn', notice: 'no-reconnect' });
        expect(scriptNotice('queue-full', { count: 3 })).toEqual({
            level: 'warn',
            notice: 'queue-full',
            params: { count: 3 },
        });
        expect(scriptNoticeSchema.parse(scriptNotice('folder-unreadable', { name: 'x' }))).toEqual({
            level: 'warn',
            notice: 'folder-unreadable',
            params: { name: 'x' },
        });
    });

    it('refuses a code it does not know, a sentence and a field it does not know', () => {
        expect(scriptNoticeSchema.safeParse({ level: 'warn', notice: 'made-up' }).success).toBe(
            false,
        );
        expect(
            scriptNoticeSchema.safeParse({ level: 'warn', notice: 'note-cut', text: 'cut' })
                .success,
        ).toBe(false);
        expect(scriptNoticeSchema.safeParse({ level: 'log', notice: 'note-cut' }).success).toBe(
            false,
        );
    });

    it('sits in the console next to the lines a script wrote', () => {
        const lines = [
            { level: 'log', text: 'hola' },
            { level: 'warn', notice: 'note-cut' },
        ];

        expect(lines.map((line) => chainLogSchema.parse(line))).toEqual(lines);
        expect(chainLogSchema.safeParse({ level: 'warn' }).success).toBe(false);
    });
});
