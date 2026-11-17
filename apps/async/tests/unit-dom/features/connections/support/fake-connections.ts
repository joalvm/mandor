import type { Connection } from '@mandor/schema';

/** A whole connection out of two words, so a test writes only what it is about. */
export function fakeConnection(id: string, name: string): Connection {
    return {
        id,
        name,
        transport: 'websocket',
        url: `ws://127.0.0.1:8080/${id}`,
        headers: [],
        environmentId: null,
    };
}
