import { describe, expect, it } from 'vitest';

import { errorReasonOf } from '../../src/send/error-reason-of.js';

function withCode(code: string, message = 'system error'): Error {
    const error: NodeJS.ErrnoException = new Error(message);

    error.code = code;

    return error;
}

function wrapped(code: string): Error {
    const cause: NodeJS.ErrnoException = new Error('underlying');

    cause.code = code;
    const error = new Error('undici wrapper');

    (error as NodeJS.ErrnoException & { cause?: Error }).cause = cause;

    return error;
}

describe('errorReasonOf', () => {
    it('names the caller abort before anything else', () => {
        expect(errorReasonOf(withCode('ECONNREFUSED'), 'user')).toBe('aborted');
        expect(errorReasonOf(undefined, 'user')).toBe('aborted');
    });

    it('names the total timeout when the total clock fired', () => {
        expect(errorReasonOf(undefined, 'total')).toBe('timeout-total');
    });

    it.each([
        ['UND_ERR_CONNECT_TIMEOUT', 'timeout-connect'],
        ['ENOTFOUND', 'dns'],
        ['EAI_AGAIN', 'dns'],
        ['ECONNREFUSED', 'refused'],
        ['UND_ERR_ABORTED', 'aborted'],
    ])('maps the code %s to %s', (code, reason) => {
        expect(errorReasonOf(withCode(code), 'none')).toBe(reason);
    });

    it('reads the code from the cause when undici wrapped it', () => {
        expect(errorReasonOf(wrapped('ECONNREFUSED'), 'none')).toBe('refused');
    });

    it.each([
        ['DEPTH_ZERO_SELF_SIGNED_CERT', 'self-signed certificate'],
        ['ERR_TLS_CERT_ALTNAME_INVALID', 'host name mismatch'],
        [undefined, 'unable to verify the first certificate'],
    ])('maps the certificate failure %s to tls', (code, message) => {
        const error = code === undefined ? new Error(message) : withCode(code, message);

        expect(errorReasonOf(error, 'none')).toBe('tls');
    });

    /** The code is the library's text, not ours: a name an object answers to must find nothing. */
    it('names no reason for a code that only an object member answers to', () => {
        expect(errorReasonOf(withCode('constructor'), 'none')).toBe('unknown');
    });

    it('reads no code that is not a text', () => {
        const error = Object.assign(new Error('odd'), { code: 42 });

        expect(errorReasonOf(error, 'none')).toBe('unknown');
    });

    it('maps anything else to unknown', () => {
        expect(errorReasonOf(new Error('something odd'), 'none')).toBe('unknown');
        expect(errorReasonOf('not even an error', 'none')).toBe('unknown');
    });
});
