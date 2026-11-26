import { describe, expect, it } from 'vitest';

import { errorMessageOf } from '../../src/send/error-message-of.js';

function withCode(code: string, message = ''): Error {
    return Object.assign(new Error(message), { code });
}

describe('the words of a failed send', () => {
    it('keeps what the error said', () => {
        expect(errorMessageOf(new Error('invalid User-Agent header'))).toBe(
            'invalid User-Agent header',
        );
    });

    /** Node fails a name with two families so: an empty aggregate that holds each attempt. */
    it('says every attempt of an error that stands for several, each on its line', () => {
        const error = new AggregateError([
            withCode('ECONNREFUSED', 'connect ECONNREFUSED ::1:81'),
            withCode('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:81'),
        ]);

        expect(errorMessageOf(error)).toBe(
            'connect ECONNREFUSED ::1:81\nconnect ECONNREFUSED 127.0.0.1:81',
        );
    });

    it('says an attempt repeated word for word once', () => {
        const same = 'connect ETIMEDOUT 10.0.0.1:443';
        const error = new AggregateError([new Error(same), new Error(same)]);

        expect(errorMessageOf(error)).toBe(same);
    });

    it('says what a silent error wraps', () => {
        const error = new Error('', { cause: new Error('other side closed') });

        expect(errorMessageOf(error)).toBe('other side closed');
    });

    it('says the code of an error with no words at all', () => {
        expect(errorMessageOf(withCode('ECONNRESET'))).toBe('ECONNRESET');
    });

    it('says at least the name of an error that carries nothing', () => {
        expect(errorMessageOf(new TypeError(''))).toBe('TypeError');
    });

    it('says what was thrown when it is not an error', () => {
        expect(errorMessageOf('socket hang up')).toBe('socket hang up');
        expect(errorMessageOf('')).toBe('unknown error');
    });
});
