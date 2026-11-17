import { Agent as HttpAgent, type ClientRequest, type IncomingMessage } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

/**
 * The most one poll may answer. The library underneath keeps the whole answer and copies it on
 * every piece that arrives, so main pays for it twice: in memory, and in time that grows with
 * the square of its size. A real server answers a poll with a few packets.
 */
export const MAX_POLL_RESPONSE_BYTES = 16 * 1024 * 1024;

type AddRequest = (request: ClientRequest, options: unknown) => void;

/**
 * The agent every poll goes out by: the one given (a proxy), or a fresh one per socket, as when
 * none is given. An answer that passes `MAX_POLL_RESPONSE_BYTES` is cut, and the poll fails as
 * a dropped connection does. A websocket keeps its own limit and never goes through here.
 */
export function pollingAgentOf(secure: boolean, agent: HttpAgent | undefined): HttpAgent {
    const base = agent ?? (secure ? new HttpsAgent() : new HttpAgent());
    const addRequest = (Reflect.get(base, 'addRequest') as AddRequest).bind(base);

    return Object.create(base, {
        addRequest: {
            value: (request: ClientRequest, options: unknown) => {
                request.once('response', limitAnswer);
                addRequest(request, options);
            },
        },
    }) as HttpAgent;
}

function limitAnswer(response: IncomingMessage): void {
    let received = 0;

    response.on('data', (chunk: Buffer) => {
        received += chunk.length;

        if (received > MAX_POLL_RESPONSE_BYTES) {
            response.destroy(
                new Error(`a poll answered past ${String(MAX_POLL_RESPONSE_BYTES)} bytes`),
            );
        }
    });
}
