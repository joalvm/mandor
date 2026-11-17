import { describe, expectTypeOf, it } from 'vitest';

import type {
    CloseConnectionRequest,
    OpenConnectionRequest,
    RetryNowConnectionRequest,
    SendConnectionRequest,
    SocketTransport,
} from '../../src/manager/connection-requests.js';

describe('the requests the connection manager accepts', () => {
    it('holds two transports, and only those', () => {
        expectTypeOf<SocketTransport>().toEqualTypeOf<'websocket' | 'socketio'>();
    });

    it('needs an id, a transport and an address to open a connection', () => {
        expectTypeOf<OpenConnectionRequest['connectionId']>().toEqualTypeOf<string>();
        expectTypeOf<OpenConnectionRequest['transport']>().toEqualTypeOf<SocketTransport>();
        expectTypeOf<OpenConnectionRequest['url']>().toEqualTypeOf<string>();
    });

    it('lets the rest of an opening be absent', () => {
        expectTypeOf<OpenConnectionRequest['namespace']>().toEqualTypeOf<string | undefined>();
        expectTypeOf<OpenConnectionRequest['verifyCertificate']>().toEqualTypeOf<
            boolean | undefined
        >();
    });

    it('needs an id and the resolved frame to send, and lets an answer be awaited', () => {
        expectTypeOf<SendConnectionRequest['connectionId']>().toEqualTypeOf<string>();
        expectTypeOf<SendConnectionRequest['data']>().toEqualTypeOf<string>();
        expectTypeOf<SendConnectionRequest['expectAck']>().toEqualTypeOf<
            { timeoutMs: number } | undefined
        >();
    });

    it('names only the connection to close it or to retry it now', () => {
        expectTypeOf<CloseConnectionRequest>().toEqualTypeOf<{ connectionId: string }>();
        expectTypeOf<RetryNowConnectionRequest>().toEqualTypeOf<{ connectionId: string }>();
    });
});
