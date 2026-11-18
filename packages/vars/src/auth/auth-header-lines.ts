import type { AuthConfig, BasicAuth, BearerAuth, ApiKeyAuth, ConcreteAuth } from '@mandor/schema';

import { authParts, encodeBasic } from './auth-parts.js';
import { scanTemplate } from '../resolution/scan-template.js';

/** The header one scheme lays on the request, said before it goes out. */
export type AuthHeaderLine = {
    name: string;
    /** The value as configured, its `{{var}}` still in it. */
    value?: string | undefined;
    /** The value is worked out when the request goes out, not before. */
    calculated?: boolean | undefined;
};

/** A text with no `{{var}}` left in it: what can be said now instead of later. */
function isLiteral(text: string): boolean {
    return scanTemplate(text).every((segment) => segment.kind === 'literal');
}

function headerOf(name: string, value: string): AuthHeaderLine {
    return { name, value };
}

function calculatedHeaderOf(name: string): AuthHeaderLine {
    return { calculated: true, name };
}

/** The scheme works its header out on the send: a challenge, a signature or a token from a flow. */
function calculatedLines(): AuthHeaderLine[] {
    return [calculatedHeaderOf('Authorization')];
}

/** The Basic pair said worked out while it is written text, computed-on-send otherwise. */
function basicLine(auth: BasicAuth): AuthHeaderLine {
    const worked = isLiteral(auth.username) && isLiteral(auth.password);

    return worked
        ? headerOf('Authorization', `Basic ${encodeBasic(auth.username, auth.password)}`)
        : calculatedHeaderOf('Authorization');
}

/** The headers the bearer token or the API key rides, as configured. */
function configuredLines(auth: BearerAuth | ApiKeyAuth): AuthHeaderLine[] {
    return authParts(auth, {})
        .headers.filter(([name]) => name !== '')
        .map(([name, value]) => headerOf(name, value));
}

type LinesOf<Type extends ConcreteAuth['type']> = (
    auth: Extract<ConcreteAuth, { type: Type }>,
) => AuthHeaderLine[];

/** One entry per scheme, chosen by the type the level carries. None adds no header. */
const LINES_OF_SCHEME: { [Type in ConcreteAuth['type']]: LinesOf<Type> } = {
    none: () => [],
    basic: (auth) => [basicLine(auth)],
    bearer: configuredLines,
    apikey: configuredLines,
    digest: calculatedLines,
    awsv4: calculatedLines,
    'oauth2-client-credentials': calculatedLines,
    'oauth2-code-pkce': calculatedLines,
};

/**
 * The headers the auth would add, as the table of headers says them before the send: the
 * value as configured while it is still written text, and said as computed-on-send when only
 * the send can work it out — the base64 of a `basic` pair carries a `{{var}}` inside, and an
 * OAuth2 token lives in the session until the flow brings one. A key that travels in the
 * query, a cookie or the subprotocol adds no header and is not said here.
 */
export function authHeaderLines(auth: AuthConfig): AuthHeaderLine[] {
    if (!('type' in auth)) {
        return [];
    }

    return linesBy(auth.type, auth);
}

/** The type and the level travel apart, so the compiler pairs the entry with its own level. */
function linesBy<Type extends ConcreteAuth['type']>(
    type: Type,
    auth: Extract<ConcreteAuth, { type: Type }>,
): AuthHeaderLine[] {
    return LINES_OF_SCHEME[type](auth);
}
