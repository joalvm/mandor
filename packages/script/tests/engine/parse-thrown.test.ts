import { describe, expect, it } from 'vitest';

import { parseThrown, UNREADABLE } from '../../src/engine/parse-thrown.js';

function thrown(stack: string): string {
    return JSON.stringify({ name: 'TypeError', message: 'boom', stack });
}

describe('parseThrown', () => {
    it('reads name and message, and the line and column from the stack', () => {
        expect(parseThrown(thrown('    at <eval> (script.js:3:9)\n'))).toEqual({
            message: 'boom',
            errorName: 'TypeError',
            line: 3,
            column: 9,
        });
    });

    it('keeps the line when the stack has no column', () => {
        expect(parseThrown(thrown('at script.js:7'))).toEqual({
            message: 'boom',
            errorName: 'TypeError',
            line: 7,
        });
    });

    it('gives no place when the stack names none', () => {
        expect(parseThrown(thrown(''))).toEqual({ message: 'boom', errorName: 'TypeError' });
    });

    it('ignores a place in another file', () => {
        expect(parseThrown(thrown('at other.js:3:9'))).toEqual({
            message: 'boom',
            errorName: 'TypeError',
        });
    });

    it.each([
        ['text that is no JSON', 'not json'],
        ['JSON that is no object', '42'],
        ['null', 'null'],
        ['an object without a field', JSON.stringify({ name: 'A', message: 'b' })],
        [
            'an object with a field of the wrong type',
            JSON.stringify({ name: 'A', message: 1, stack: '' }),
        ],
    ])('gives the error that could not be read for %s', (_name, text) => {
        expect(parseThrown(text)).toEqual(UNREADABLE);
    });

    describe('with the window of the script inside a bigger source', () => {
        const span = { offset: 2, lines: 4 };

        it('gives the line and column counted from the script', () => {
            expect(parseThrown(thrown('at script.js:5:9'), span)).toEqual({
                message: 'boom',
                errorName: 'TypeError',
                line: 3,
                column: 9,
            });
        });

        it('takes the first and the last line of the script', () => {
            expect(parseThrown(thrown('at script.js:3:1'), span)).toMatchObject({ line: 1 });
            expect(parseThrown(thrown('at script.js:6:1'), span)).toMatchObject({ line: 4 });
        });

        it('takes the first frame that is inside the script when the first one is not', () => {
            const stack = 'at assert (script.js:40:3)\nat <eval> (script.js:4:2)\nat script.js:1:1';

            expect(parseThrown(thrown(stack), span)).toMatchObject({ line: 2, column: 2 });
        });

        it('gives no place when no frame is inside the script', () => {
            const stack = 'at assert (script.js:40:3)\nat script.js:1:1';

            expect(parseThrown(thrown(stack), span)).toEqual({
                message: 'boom',
                errorName: 'TypeError',
            });
        });

        it.each([1, 2, 7])('gives no place for line %i, which is not in the script', (line) => {
            expect(parseThrown(thrown(`at script.js:${String(line)}:3`), span)).toEqual({
                message: 'boom',
                errorName: 'TypeError',
            });
        });
    });
});
