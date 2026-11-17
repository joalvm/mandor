import { randomBytes } from 'node:crypto';

import type { SyncAuth, SyncDigestAuth, SyncRequest } from '../request/sync-request.js';
import type { SyncResponse } from '../response/sync-response.js';
import { digestAuthorization } from './digest-authorization.js';
import { digestChallengeOf } from './digest-challenge.js';
import { signAwsV4 } from './sign-aws-v4.js';

type Send = (request: SyncRequest) => Promise<SyncResponse>;

/** What a signature reads of the world: the time, and the nonce a Digest answer invents. */
export type AuthClock = { now: () => Date; cnonce: () => string };

const SYSTEM_CLOCK: AuthClock = {
    now: () => new Date(),
    cnonce: () => randomBytes(16).toString('hex'),
};

/** Each auth a request may carry, by the scheme it goes under. */
type AuthOf = { [Scheme in SyncAuth['scheme']]: Extract<SyncAuth, { scheme: Scheme }> };

type Authorize<Scheme extends keyof AuthOf> = (
    request: SyncRequest,
    auth: AuthOf[Scheme],
    send: Send,
    clock: AuthClock,
) => Promise<SyncResponse>;

function withAuthorization(request: SyncRequest, value: string): SyncRequest {
    return {
        ...request,
        headers: [...request.headers, ['Authorization', value]],
    };
}

/** The request goes bare; a 401 with a Digest challenge it can answer sends it once more. */
async function sendWithDigest(
    request: SyncRequest,
    auth: SyncDigestAuth,
    send: Send,
    clock: AuthClock,
): Promise<SyncResponse> {
    const first = await send(request);
    const challenge = first.status === 401 ? digestChallengeOf(first.headers) : undefined;

    if (challenge === undefined) {
        return first;
    }

    const url = new URL(request.url);
    const authorization = digestAuthorization(
        {
            method: request.method,
            uri: `${url.pathname}${url.search}`,
            body: request.body,
            username: auth.username,
            password: auth.password,
            cnonce: clock.cnonce(),
        },
        challenge,
    );

    return authorization === undefined ? first : send(withAuthorization(request, authorization));
}

/** How each scheme puts its credentials on a request: before the send, or after a challenge. */
const AUTHORIZE: { [Scheme in keyof AuthOf]: Authorize<Scheme> } = {
    digest: sendWithDigest,
    awsv4: (request, auth, send, clock) => send(signAwsV4(request, auth, clock.now())),
};

/**
 * One hop with the credentials its scheme works out against the request itself. Only a hop of
 * the origin the request started at carries them: a redirect elsewhere goes bare, as the
 * credential headers do. An `Authorization` written by hand wins, and the scheme stays out.
 */
export async function sendAuthorized(
    request: SyncRequest,
    origin: string,
    send: Send,
    clock: AuthClock = SYSTEM_CLOCK,
): Promise<SyncResponse> {
    const { auth } = request;
    const written = request.headers.some(([name]) => name.toLowerCase() === 'authorization');

    if (auth === undefined || written || new URL(request.url).origin !== origin) {
        return send(request);
    }

    return authorizerOf(auth.scheme, auth)(request, send, clock);
}

/**
 * The way of one scheme, bound to its auth. Read through a scheme that is a type parameter, the
 * table answers the way that takes the auth of that same scheme, so the pairing needs no cast.
 */
function authorizerOf<Scheme extends keyof AuthOf>(
    scheme: Scheme,
    auth: AuthOf[Scheme],
): (request: SyncRequest, send: Send, clock: AuthClock) => Promise<SyncResponse> {
    return (request, send, clock) => AUTHORIZE[scheme](request, auth, send, clock);
}
