import { describe, expect, it } from 'vitest';

import { SocketOpenError } from '../../src/manager/socket-open-error.js';

function withCode(message: string, code: string): Error {
    return Object.assign(new Error(message), { code });
}

describe('what a socket that never opened says', () => {
    it('carries its reason and the words of what the libraries raised', () => {
        const error = new SocketOpenError(
            'refused',
            withCode('connect ECONNREFUSED', 'ECONNREFUSED'),
        );

        expect(error.reason).toBe('refused');
        expect(error.name).toBe('SocketOpenError');
        expect(error.message).toBe('the socket closed before it opened: connect ECONNREFUSED');
    });

    /** Node fails a name with several addresses with an aggregate that has no message of its own. */
    it('says each attempt once when the cause stands for several addresses', () => {
        const cause = new AggregateError([
            withCode('connect ECONNREFUSED ::1:1', 'ECONNREFUSED'),
            withCode('connect ECONNREFUSED 127.0.0.1:1', 'ECONNREFUSED'),
            withCode('connect ECONNREFUSED 127.0.0.1:1', 'ECONNREFUSED'),
        ]);

        expect(new SocketOpenError('refused', cause).message).toBe(
            'the socket closed before it opened: connect ECONNREFUSED ::1:1; connect ECONNREFUSED 127.0.0.1:1',
        );
    });

    it('falls back on its reason when the cause says nothing', () => {
        expect(new SocketOpenError('unknown', new AggregateError([])).message).toBe(
            'the socket closed before it opened: unknown',
        );
        expect(new SocketOpenError('timeout', undefined).message).toBe(
            'the socket closed before it opened: timeout',
        );
    });
});
