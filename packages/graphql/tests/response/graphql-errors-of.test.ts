import { describe, expect, it } from 'vitest';

import { graphqlErrorsOf } from '../../src/response/graphql-errors-of.js';

describe('graphqlErrorsOf', () => {
    it('counts the errors and keeps their messages', () => {
        const text = JSON.stringify({ data: null, errors: [{ message: 'a' }, { message: 'b' }] });

        expect(graphqlErrorsOf(text)).toEqual({ count: 2, messages: ['a', 'b'] });
    });

    it('keeps 20 messages at most but counts them all', () => {
        const errors = Array.from({ length: 25 }, (_, i) => ({ message: `e${String(i)}` }));
        const result = graphqlErrorsOf(JSON.stringify({ errors }));

        expect(result?.count).toBe(25);
        expect(result?.messages).toHaveLength(20);
        expect(result?.messages[19]).toBe('e19');
    });

    it('skips an error that carries no text message', () => {
        const text = JSON.stringify({ errors: [{ code: 1 }, { message: 'x' }, 'nope'] });

        expect(graphqlErrorsOf(text)).toEqual({ count: 3, messages: ['x'] });
    });

    it.each([
        ['not json', 'oops'],
        ['not an object', '[1]'],
        ['null', 'null'],
        ['no errors key', '{"data":{}}'],
        ['errors not an array', '{"errors":"x"}'],
        ['empty errors', '{"errors":[]}'],
    ])('answers null when the body is %s', (_name, text) => {
        expect(graphqlErrorsOf(text)).toBeNull();
    });
});
