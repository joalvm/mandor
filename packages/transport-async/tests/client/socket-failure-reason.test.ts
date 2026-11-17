import { describe, expect, it } from 'vitest';

import { socketFailureReasonOf } from '../../src/client/socket-failure-reason.js';

/** A Node error as the network layer raises it: a message and the system code beside it. */
function systemError(message: string, code: string): Error {
    return Object.assign(new Error(message), { code });
}

/**
 * What Socket.IO raises when its websocket underneath fails: the error event of `ws`, with the
 * error of the network layer inside it. Shapes as socket.io-client 4 and engine.io-client 6 give
 * them under Node.
 */
function overWebsocket(cause: Error): Error {
    return Object.assign(new Error('websocket error'), {
        type: 'TransportError',
        description: { type: 'error', message: cause.message, error: cause },
    });
}

/** A polling request that failed: the status it got, and the request that keeps the cause. */
function overPolling(status: number, cause?: Error): Error {
    return Object.assign(new Error('xhr poll error'), {
        type: 'TransportError',
        description: status,
        context: { status, statusText: cause },
    });
}

describe('why a socket could not open', () => {
    it.each([
        ['dns', systemError('getaddrinfo ENOTFOUND nowhere.invalid', 'ENOTFOUND')],
        ['dns', systemError('getaddrinfo EAI_AGAIN nowhere.invalid', 'EAI_AGAIN')],
        ['refused', systemError('connect ECONNREFUSED 127.0.0.1:1', 'ECONNREFUSED')],
        ['timeout', systemError('connect ETIMEDOUT 10.0.0.1:443', 'ETIMEDOUT')],
        ['tls', systemError('self-signed certificate', 'DEPTH_ZERO_SELF_SIGNED_CERT')],
        ['tls', systemError('unable to verify', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE')],
        ['tls', systemError('altname', 'ERR_TLS_CERT_ALTNAME_INVALID')],
        ['tls', systemError('wrong version number', 'ERR_SSL_WRONG_VERSION_NUMBER')],
    ])('reads %s from the code of a websocket error', (reason, error) => {
        expect(socketFailureReasonOf(error)).toBe(reason);
    });

    it.each([
        ['timeout', 'Opening handshake has timed out'],
        ['rejected', 'Unexpected server response: 401'],
    ])('reads %s from what ws says when no code does', (reason, message) => {
        expect(socketFailureReasonOf(new Error(message))).toBe(reason);
    });

    it('reads the cause Socket.IO wraps inside the websocket it dialled', () => {
        const refused = systemError('connect ECONNREFUSED 127.0.0.1:1', 'ECONNREFUSED');
        const rejected = new Error('Unexpected server response: 403');

        expect(socketFailureReasonOf(overWebsocket(refused))).toBe('refused');
        expect(socketFailureReasonOf(overWebsocket(rejected))).toBe('rejected');
    });

    it('reads the cause a failed polling request keeps, or the status it answered', () => {
        const dns = systemError('getaddrinfo ENOTFOUND nowhere.invalid', 'ENOTFOUND');

        expect(socketFailureReasonOf(overPolling(0, dns))).toBe('dns');
        expect(socketFailureReasonOf(overPolling(401))).toBe('rejected');
        expect(socketFailureReasonOf(overPolling(0))).toBe('unknown');
    });

    it('reads the handshake Socket.IO gave up waiting for as a timeout', () => {
        expect(socketFailureReasonOf(new Error('timeout'))).toBe('timeout');
    });

    /** The server ran its own checks on the namespace and said no, with its own words. */
    it('reads a namespace the server refused to join as rejected', () => {
        const refused = Object.assign(new Error('not authorized'), { data: undefined });

        expect(socketFailureReasonOf(refused)).toBe('rejected');
    });

    it('reads the first attempt of an address that dialled several', () => {
        const both = new AggregateError([
            systemError('connect ECONNREFUSED ::1:80', 'ECONNREFUSED'),
            systemError('connect ECONNREFUSED 127.0.0.1:80', 'ECONNREFUSED'),
        ]);

        expect(socketFailureReasonOf(both)).toBe('refused');
    });

    it('reads the cause an error names', () => {
        const wrapped = new Error('dial failed', {
            cause: systemError('getaddrinfo ENOTFOUND x', 'ENOTFOUND'),
        });

        expect(socketFailureReasonOf(wrapped)).toBe('dns');
    });

    /** The code is the system's, not ours: a name every object answers to is still unknown. */
    it.each([
        new Error('socket hang up'),
        systemError('reset', 'ECONNRESET'),
        systemError('odd', 'constructor'),
        'a string thrown as is',
        null,
    ])('says unknown for what it cannot name: %s', (error) => {
        expect(socketFailureReasonOf(error)).toBe('unknown');
    });

    it('stops walking a cause that refers back to itself', () => {
        const looped: Error & { cause?: unknown } = new Error('loop');

        looped.cause = looped;

        expect(socketFailureReasonOf(looped)).toBe('unknown');
    });
});
