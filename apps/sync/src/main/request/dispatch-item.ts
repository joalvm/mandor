import type { DialTls, EnvironmentPlace, NetworkFor } from '@mandor/host';
import { success, type RequestSendRequest, type Result } from '@mandor/ipc';
import { withSendDefaults, type RequestBodyType } from '@mandor/schema';
import {
    sendRequest,
    withCookieHeader,
    type CookiePort,
    type CrossOriginGuard,
    type SyncRequest,
    type SyncResponse,
} from '@mandor/transport-sync';

import { SPILL_BYTES } from './body-limits.js';
import type { BodyHold } from './body-holds.js';
import { diskBodySpill } from './disk-body-spill.js';
import type { GuardedRequest, SendGuard } from './guarded-resolution.js';
import { requestBodyBytes } from './request-body-bytes.js';
import type { ResolvedBody } from './request-templates.js';
import { resolveRequest } from './resolve-request.js';
import type { SentRequest } from './send-event.js';

/** What dispatching needs of the app: where the request is resolved and how it reaches the network. */
export type DispatchContext = {
    place: EnvironmentPlace;
    networkFor: NetworkFor;
    /** The jar of the environment: asked on every hop. Absent, the send carries no cookie but its own. */
    cookies?: CookiePort | undefined;
    /** Told what is about to leave, before it does, so a send that fails still knows what it was. */
    onSent?: ((sent: SentRequest) => void) | undefined;
    /** Keeps what the send spills from removal until its entry names it. Absent, nobody will. */
    hold?: BodyHold | undefined;
    /** The scripts a send of the person ran. Absent: a question of the app, which runs none. */
    guard?: SendGuard | undefined;
    /** Told what the guard left the send with once it is resolved: what it withheld, and why. */
    onGuarded?: ((guarded: GuardedRequest | undefined) => void) | undefined;
};

/** What a caller that is not a send changes of the request on screen; each one is optional. */
export type DispatchOverrides = {
    /** Replaces the body once the request is resolved, so the variables of the old one stay unread. */
    body?: ResolvedBody | undefined;
    method?: string | undefined;
    /** Where a response body stops being held in memory and goes to disk. */
    spillThresholdBytes?: number | undefined;
    /** The most a body may bring, decoded; the tighter of this and the request's own limit wins. */
    maxResponseBytes?: number | undefined;
};

/** What came back, and the type of the body that was sent for it. */
/** The answer, the kind of body that asked for it, and the URL it was asked of, variables resolved. */
export type Dispatched = { bodyType: RequestBodyType; response: SyncResponse; url: string };

/** The request of a window: what a send carries, without the id of the send. */
export type DispatchInput = Omit<RequestSendRequest, 'sendId'>;

/** The certificates of the machine beside the trust the request decides: whether to verify. */
function tlsWith(trust: SyncRequest['tls'], machine: DialTls): SyncRequest['tls'] {
    const { ca, ...client } = machine;
    const authority = ca === undefined ? {} : { ca };
    const shown = Object.keys(client).length === 0 ? {} : { clientCert: client };

    return { ...trust, ...authority, ...shown };
}

/**
 * What a hop to another origin may not carry of a send a script shaped: its secret lines, a secret
 * body, and an address that spells a secret, wherever the send had it (its url too). A send no
 * script shaped follows the rules of today.
 */
function crossOriginGuardOf(guarded: GuardedRequest | undefined): CrossOriginGuard | undefined {
    if (guarded?.influenced !== true) {
        return undefined;
    }

    const { headers, bodySecret, spellings } = guarded;

    return { headers, bodySecret, spellings };
}

/** The smallest of the limits that are set; none set, no limit. */
function tightest(limits: readonly (number | undefined)[]): number | undefined {
    const set = limits.filter((limit) => limit !== undefined);

    return set.length === 0 ? undefined : Math.min(...set);
}

/**
 * How a url reaches the network under the trust the request decides. The proxy and the client
 * certificate belong to a host, so each hop of a redirect to another url asks again.
 */
function dialerOf(
    networkFor: NetworkFor,
    trust: SyncRequest['tls'],
): (url: string) => Promise<Pick<SyncRequest, 'proxy' | 'tls'>> {
    return async (url) => {
        const network = await networkFor(url);

        return { proxy: network.proxy, tls: tlsWith(trust, network.tls) };
    };
}

/**
 * Takes the request a window shows from its variables to the wire: resolves it against the
 * environment, builds the body, finds how the url reaches the network, sends. A send and a
 * question the app asks on the user's behalf, such as a server's schema, go the same way and so
 * are allowed in by the same rules.
 */
export async function dispatchItem(
    context: DispatchContext,
    input: DispatchInput,
    overrides: DispatchOverrides,
    signal: AbortSignal,
): Promise<Result<Dispatched>> {
    const resolved = await resolveRequest(context.place, input, {
        signal,
        networkFor: context.networkFor,
        guard: context.guard,
    });

    if (!resolved.ok) {
        return resolved;
    }

    const { body: written, cookieJar, headers, signing, guarded, ...rest } = resolved.value;

    context.onGuarded?.(guarded);

    const body = overrides.body ?? written;
    const method = overrides.method ?? rest.method;
    // A request that leaves the jar out neither sends its cookies nor keeps the answer's.
    const cookies = cookieJar ? context.cookies : undefined;

    // The defaults the send lays down itself ride beside what the user wrote; the history
    // shows them, because they are part of what leaves.
    const sent = await requestBodyBytes(context.place.root, body, withSendDefaults(headers));

    // The first hop's jar cookies are part of what leaves: the history shows them as it shows the rest.
    const leaving = withCookieHeader(sent.headers, (await cookies?.header(rest.url)) ?? null);

    context.onSent?.({
        method,
        url: rest.url,
        headers: leaving.map(([name, value]) => [name, value]),
        bytes: sent.bytes,
    });

    const dial = dialerOf(context.networkFor, rest.tls);
    const response = await sendRequest(
        {
            ...rest,
            method,
            headers: sent.headers,
            body: sent.bytes,
            auth: signing,
            redirects: { ...rest.redirects, crossOriginGuard: crossOriginGuardOf(guarded) },
            cookies,
            maxResponseBytes: tightest([rest.maxResponseBytes, overrides.maxResponseBytes]),
            ...(await dial(rest.url)),
            dial,
            spill: {
                thresholdBytes: overrides.spillThresholdBytes ?? SPILL_BYTES,
                open: () => diskBodySpill(context.place.root, context.hold),
            },
        },
        signal,
    );

    return success({ bodyType: body.type, response, url: rest.url });
}
