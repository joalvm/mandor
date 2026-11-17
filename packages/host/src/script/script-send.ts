import { SCRIPT_LIMITS } from '@mandor/script';
import { z } from 'zod';

import { fetchThrough } from '../network/fetch-through.js';
import type { NetworkFor } from '../network/network-for.js';

import { failedReply } from './send-reply.js';

/** What the guest sends: the request as plain text, which main reads again as untrusted. */
const sendPayloadSchema = z.object({
    url: z.string(),
    method: z.string().min(1),
    headers: z.array(z.object({ name: z.string().min(1), value: z.string() })),
    body: z.string().optional(),
});

type SendPayload = z.infer<typeof sendPayloadSchema>;

/** The schemes a script may reach: nothing local, nothing that is not a web request. */
const WEB_SCHEMES = new Set(['http:', 'https:']);

export type ScriptSenderDeps = {
    /** How each url reaches the network on this machine: proxy and certificates. */
    networkFor: NetworkFor;
    /**
     * Takes out of the text of an answer what must not reach the script. Main calls it for each
     * answer, on the body and on each value of a header, with what is secret at that moment.
     */
    hide: (text: string) => string;
    /** How long one request may take. */
    timeoutMs?: number;
};

/** Answers a send of the guest with the reply as text; it never rejects for a request that fails. */
export type ScriptSender = (payload: string, signal: AbortSignal) => Promise<string>;

function payloadOf(text: string): SendPayload | undefined {
    try {
        const parsed = sendPayloadSchema.safeParse(JSON.parse(text));

        return parsed.success ? parsed.data : undefined;
    } catch {
        return undefined;
    }
}

/** The request read again, or why it cannot go out. */
function checked(text: string): { payload: SendPayload } | { refusal: string } {
    const payload = payloadOf(text);

    if (payload === undefined) {
        return { refusal: 'The request is not valid' };
    }

    let url: URL;

    try {
        url = new URL(payload.url);
    } catch {
        return { refusal: 'The url of the request is not valid' };
    }

    if (!WEB_SCHEMES.has(url.protocol)) {
        return { refusal: `A script can send to http and https only, not to ${url.protocol}` };
    }

    if (Buffer.byteLength(payload.body ?? '') > SCRIPT_LIMITS.sendRequestBytes) {
        const limit = String(SCRIPT_LIMITS.sendRequestBytes);

        return { refusal: `The body of the request is bigger than ${limit} bytes` };
    }

    return { payload };
}

/** The code of the network error when there is one: it says more than "fetch failed". */
function reasonOf(error: unknown): string {
    const code = (error as { cause?: { code?: unknown } }).cause?.code;

    if (typeof code === 'string') {
        return `The request failed: ${code}`;
    }

    return error instanceof Error ? error.message : String(error);
}

function okReply(
    answer: Response,
    text: string,
    startedAt: number,
    hide: (text: string) => string,
): string {
    return JSON.stringify({
        ok: true,
        status: answer.status,
        headers: [...answer.headers].map(([name, value]) => ({ name, value: hide(value) })),
        text: hide(text),
        timeMs: Math.round(performance.now() - startedAt),
    });
}

/**
 * The sender of the scripts of an app: the one place a request of a script leaves from. The guest
 * only says what it wants; here the request is read again, held to the web schemes, to a size and
 * to a time, sent through the network of the machine and never followed to another address: a
 * redirect comes back to the script as it is. An answer carries what the script may read of it.
 */
export function newScriptSender({
    networkFor,
    hide,
    timeoutMs = SCRIPT_LIMITS.sendRequestMs,
}: ScriptSenderDeps): ScriptSender {
    const through = fetchThrough(networkFor);

    return async (text, chain) => {
        const request = checked(text);

        if ('refusal' in request) {
            return failedReply(request.refusal);
        }

        const { payload } = request;
        const timeout = AbortSignal.timeout(timeoutMs);
        const startedAt = performance.now();

        try {
            const answer = await through(payload.url, {
                method: payload.method,
                headers: payload.headers.map(({ name, value }): [string, string] => [name, value]),
                ...(payload.body === undefined ? {} : { body: payload.body }),
                redirect: 'manual',
                signal: AbortSignal.any([chain, timeout]),
            });

            return okReply(answer, await answer.text(), startedAt, hide);
        } catch (error) {
            return failedReply(
                timeout.aborted
                    ? `The request took longer than ${String(timeoutMs)} ms`
                    : reasonOf(error),
            );
        }
    };
}
