import type {
    ApiKeyAuth,
    AuthConfig,
    AwsSigV4Auth,
    BasicAuth,
    BearerAuth,
    ConcreteAuth,
    DigestAuth,
} from '@mandor/schema';

/**
 * The resolved credentials of a scheme that works its header out against the request itself —
 * after a challenge, or as a signature of the url, the headers and the body — so only the send
 * can apply them.
 */
export type AuthSigning =
    | { scheme: 'digest'; username: string; password: string }
    | {
          scheme: 'awsv4';
          accessKeyId: string;
          secretAccessKey: string;
          region?: string;
          service?: string;
          sessionToken?: string;
      };

/** Where the resolved credentials go once they are plain text. Every value is a secret. */
export type AuthParts = {
    headers: [string, string][];
    query: [string, string][];
    cookies: [string, string][];
    subprotocols: string[];
    /** Absent for a scheme whose parts are all said above. */
    signing?: AuthSigning | undefined;
};

const EMPTY_PARTS: AuthParts = { headers: [], query: [], cookies: [], subprotocols: [] };

type PartsOf<Type extends ConcreteAuth['type']> = (
    auth: Extract<ConcreteAuth, { type: Type }>,
    resolved: Record<string, string>,
    token: string | undefined,
) => AuthParts;

/** An OAuth2 level carries the token its flow obtained, as a bearer, or nothing without one. */
function tokenParts(token: string | undefined): AuthParts {
    return token === undefined
        ? EMPTY_PARTS
        : { ...EMPTY_PARTS, headers: [['Authorization', `Bearer ${token}`]] };
}

/** One builder per scheme, chosen by the type the level carries. */
const PARTS_OF_SCHEME: { [Type in ConcreteAuth['type']]: PartsOf<Type> } = {
    none: () => EMPTY_PARTS,
    basic: (auth, resolved) => basicParts(auth, resolved),
    bearer: (auth, resolved) => ({
        ...EMPTY_PARTS,
        headers: [['Authorization', bearerValue(auth, resolved)]],
    }),
    apikey: (auth, resolved) => apiKeyParts(auth, resolved),
    digest: (auth, resolved) => ({ ...EMPTY_PARTS, signing: digestSigning(auth, resolved) }),
    awsv4: (auth, resolved) => ({ ...EMPTY_PARTS, signing: awsSigning(auth, resolved) }),
    'oauth2-client-credentials': (_auth, _resolved, token) => tokenParts(token),
    'oauth2-code-pkce': (_auth, _resolved, token) => tokenParts(token),
};

/**
 * Builds the parts of one concrete scheme out of its resolved templates — `resolved` holds
 * what `resolveTemplates` produced for `authTemplates`, and the template as written fills in
 * any key the resolution left out. Inherit and none produce nothing: the caller resolved the
 * chain before asking for parts. An API key in a subprotocol travels as the value — the name
 * is a label, the protocol is what the server reads. An OAuth2 level produces its header from
 * `token`, the one the flow already obtained; without it there is nothing to apply.
 */
export function authParts(
    auth: AuthConfig,
    resolved: Record<string, string>,
    token?: string,
): AuthParts {
    if (!('type' in auth)) {
        return EMPTY_PARTS;
    }

    return partsBy(auth.type, auth, resolved, token);
}

/** The type and the level travel apart, so the compiler pairs the builder with its own level. */
function partsBy<Type extends ConcreteAuth['type']>(
    type: Type,
    auth: Extract<ConcreteAuth, { type: Type }>,
    resolved: Record<string, string>,
    token: string | undefined,
): AuthParts {
    return PARTS_OF_SCHEME[type](auth, resolved, token);
}

/** base64 of the utf-8 bytes of `user:pass`, as RFC 7617 asks — `btoa` alone mangles accents. */
export function encodeBasic(username: string, password: string): string {
    const bytes = new TextEncoder().encode(`${username}:${password}`);
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

function basicParts(auth: BasicAuth, resolved: Record<string, string>): AuthParts {
    const username = pick(resolved, 'auth:username', auth.username);
    const password = pick(resolved, 'auth:password', auth.password);

    return {
        ...EMPTY_PARTS,
        headers: [['Authorization', `Basic ${encodeBasic(username, password)}`]],
    };
}

function bearerValue(auth: BearerAuth, resolved: Record<string, string>): string {
    const token = pick(resolved, 'auth:token', auth.token);
    const prefix =
        auth.prefix === undefined ? 'Bearer' : pick(resolved, 'auth:prefix', auth.prefix);

    return prefix === '' ? token : `${prefix} ${token}`;
}

/** Where an API key rides. In a subprotocol the name is a label: the value is what travels. */
const API_KEY_PLACE: Record<ApiKeyAuth['in'], (name: string, value: string) => AuthParts> = {
    header: (name, value) => ({ ...EMPTY_PARTS, headers: [[name, value]] }),
    query: (name, value) => ({ ...EMPTY_PARTS, query: [[name, value]] }),
    cookie: (name, value) => ({ ...EMPTY_PARTS, cookies: [[name, value]] }),
    subprotocol: (_name, value) => ({ ...EMPTY_PARTS, subprotocols: [value] }),
};

function apiKeyParts(auth: ApiKeyAuth, resolved: Record<string, string>): AuthParts {
    const name = pick(resolved, 'auth:name', auth.name);
    const value = pick(resolved, 'auth:value', auth.value);

    return API_KEY_PLACE[auth.in](name, value);
}

function digestSigning(auth: DigestAuth, resolved: Record<string, string>): AuthSigning {
    return {
        scheme: 'digest',
        username: pick(resolved, 'auth:username', auth.username),
        password: pick(resolved, 'auth:password', auth.password),
    };
}

/** The optional fields enter, resolved, only when the level wrote them. */
function awsSigning(auth: AwsSigV4Auth, resolved: Record<string, string>): AuthSigning {
    const fields = ['region', 'service', 'sessionToken'] as const;
    const optional = fields.flatMap((field): [string, string][] => {
        const written = auth[field];

        return written === undefined ? [] : [[field, pick(resolved, `auth:${field}`, written)]];
    });

    return {
        scheme: 'awsv4',
        accessKeyId: pick(resolved, 'auth:accessKeyId', auth.accessKeyId),
        secretAccessKey: pick(resolved, 'auth:secretAccessKey', auth.secretAccessKey),
        ...Object.fromEntries(optional),
    };
}

function pick(resolved: Record<string, string>, key: string, fallback: string): string {
    return resolved[key] ?? fallback;
}
