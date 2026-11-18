import { readFile } from 'node:fs/promises';

import {
    answerRedactor,
    variableSnapshot,
    type ChainSnapshot,
    type ScriptVariablesPlace,
} from '@mandor/host';
import type { HttpResponse, ResponseBody } from '@mandor/schema';
import { SCRIPT_LIMITS } from '@mandor/script';
import { bodyFile } from '@mandor/store-fs';

import type { SendGuard } from './guarded-resolution.js';
import { requestScripts, type SendScripts } from './request-scripts.js';
import { decodedBytes } from './response-of.js';
import { runSendChain, varsOf, type ScriptsOutput } from './send-chain.js';
import type { SentRequest } from './send-event.js';

const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

type Hide = (text: string) => string;

type Line = { name: string; value: string };

/** What a script may read of some bytes: nothing when they are too many or are not text. */
function textOf(bytes: Uint8Array): string | undefined {
    if (bytes.byteLength > SCRIPT_LIMITS.payloadBytes) {
        return undefined;
    }

    try {
        return STRICT_UTF8.decode(bytes);
    } catch {
        return undefined;
    }
}

/** A body that cannot be read is one a script cannot read: the answer that came stays. */
async function storedText(root: string, ref: string): Promise<string | undefined> {
    try {
        return textOf(await readFile(bodyFile(root, ref)));
    } catch {
        return undefined;
    }
}

/**
 * The body of an answer as a script of `onResponse` reads it: none when it is over the size a
 * script may read or is not text. Read while the send still holds a stored body, so no removal
 * takes the file first.
 */
export function responseText(root: string, body: ResponseBody | null): Promise<string | undefined> {
    if (body === null) {
        return Promise.resolve('');
    }

    if (body.kind === 'stored') {
        return body.bytes > SCRIPT_LIMITS.payloadBytes
            ? Promise.resolve(undefined)
            : storedText(root, body.ref);
    }

    return Promise.resolve(textOf(decodedBytes(body)));
}

function linesOf(pairs: readonly (readonly [string, string])[], hide: Hide): Line[] {
    return pairs.map(([name, value]) => ({ name, value: hide(value) }));
}

/** What left, with every secret of this moment hidden: a script reads the request, never a key. */
function sentPhoto(
    sent: SentRequest,
    bodyType: string,
    hide: Hide,
): NonNullable<ChainSnapshot['request']> {
    const query = URL.canParse(sent.url) ? [...new URL(sent.url).searchParams] : [];
    const body =
        sent.bytes === undefined
            ? {}
            : { body: { type: bodyType, text: hide(textOf(sent.bytes) ?? '') } };

    return {
        url: hide(sent.url),
        method: sent.method,
        headers: linesOf(sent.headers, hide),
        query: linesOf(query, hide),
        ...body,
    };
}

function responsePhoto(
    response: HttpResponse,
    text: string | undefined,
    hide: Hide,
): NonNullable<ChainSnapshot['response']> {
    return {
        status: response.status,
        headers: linesOf(response.headers, hide),
        ...(text === undefined ? {} : { text: hide(text) }),
        bodyBytes: response.sizes.bodyBytes,
        timeMs: response.timings.totalMs,
    };
}

/** An answer and what left for it: what the scripts of `onResponse` read. */
export type AnsweredSend = {
    guard: SendGuard;
    sent: SentRequest | undefined;
    response: HttpResponse;
    /** The body as a script reads it, taken while the send held it. */
    text: string | undefined;
};

/**
 * The scripts of `onResponse`. Everything they read goes through the secrets known now, not those
 * of when the send began: a secret the send learnt on the way is hidden too. They change nothing
 * of an answer that already came; what they set is for the sends after.
 */
export async function scriptsOnResponse(
    deps: SendScripts,
    at: ScriptVariablesPlace,
    answered: AnsweredSend,
    signal: AbortSignal,
): Promise<ScriptsOutput> {
    const hide = answerRedactor();
    const { scope, base, applied } = answered.guard;
    const request =
        answered.sent === undefined
            ? {}
            : { request: sentPhoto(answered.sent, applied.request.body.type, hide) };
    const response = responsePhoto(answered.response, answered.text, hide);
    const set: Record<string, string> = {};

    function photo(): ChainSnapshot {
        const values = { ...deps.scriptVariables.values(at), ...set };

        return { variables: variableSnapshot(scope, values), ...request, response };
    }

    return runSendChain(deps, {
        list: requestScripts(scope.chain, base, 'onResponse'),
        snapshot: photo(),
        advance: (_snapshot, effects) => {
            Object.assign(set, varsOf(effects));

            return photo();
        },
        place: at,
        signal,
    });
}
