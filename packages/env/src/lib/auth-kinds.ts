import type { ApiKeyPlacement, AuthConfig, ConcreteAuth } from '@mandor/schema';

/** What a level says about its auth: it defers upward, or it carries one scheme. */
export type AuthKind = 'inherit' | ConcreteAuth['type'];

type AuthKindEntry = {
    kind: AuthKind;
    label: string;
    /** What the type does with the request, said once under the choice. */
    description: string;
    /** The level a reader starts from when they pick the type: every field empty. */
    start: (placements: readonly ApiKeyPlacement[]) => AuthConfig | undefined;
};

/**
 * The types the editor offers, in the order a request tool lists them: inheriting first, then
 * nothing, then the schemes from the plainest to the ones that ask a server for a token.
 */
export const AUTH_KINDS = [
    {
        kind: 'inherit',
        label: 'inherit',
        description: 'describeInherit',
        start: () => undefined,
    },
    {
        kind: 'none',
        label: 'none',
        description: 'describeNone',
        start: () => ({ type: 'none' }),
    },
    {
        kind: 'basic',
        label: 'basic',
        description: 'describeBasic',
        start: () => ({ type: 'basic', username: '', password: '' }),
    },
    {
        kind: 'bearer',
        label: 'bearer',
        description: 'describeBearer',
        start: () => ({ type: 'bearer', token: '' }),
    },
    {
        kind: 'apikey',
        label: 'apiKey',
        description: 'describeApiKey',
        start: (placements) => ({
            type: 'apikey',
            name: '',
            value: '',
            in: placements[0] ?? 'header',
        }),
    },
    {
        kind: 'digest',
        label: 'digest',
        description: 'describeDigest',
        start: () => ({ type: 'digest', username: '', password: '' }),
    },
    {
        kind: 'awsv4',
        label: 'awsV4',
        description: 'describeAwsV4',
        start: () => ({ type: 'awsv4', accessKeyId: '', secretAccessKey: '' }),
    },
    {
        kind: 'oauth2-client-credentials',
        label: 'oauth2ClientCredentials',
        description: 'describeOAuth2ClientCredentials',
        start: () => ({
            type: 'oauth2-client-credentials',
            tokenUrl: '',
            clientId: '',
            clientSecret: '',
            clientAuth: 'basic',
        }),
    },
    {
        kind: 'oauth2-code-pkce',
        label: 'oauth2CodePkce',
        description: 'describeOAuth2CodePkce',
        start: () => ({
            type: 'oauth2-code-pkce',
            authorizationUrl: '',
            tokenUrl: '',
            clientId: '',
        }),
    },
] as const satisfies readonly AuthKindEntry[];

type OfferedKind = (typeof AUTH_KINDS)[number];

/** Every scheme the editor knows: what an app offers when it names no list of its own. */
export const ALL_SCHEMES: readonly ConcreteAuth['type'][] = AUTH_KINDS.map(
    (entry) => entry.kind,
).filter((kind) => kind !== 'inherit');

/**
 * The kinds the editor offers on one level: inherit where there is a level above, and the
 * schemes the app applies. The scheme the level already carries stays named even when the app
 * does not offer it, so the reader sees what the file says and can choose another.
 */
export function offeredKinds(
    schemes: readonly ConcreteAuth['type'][],
    inheritable: boolean,
    current: AuthKind,
): OfferedKind[] {
    return AUTH_KINDS.filter((entry) => {
        if (entry.kind === 'inherit') {
            return inheritable;
        }

        return entry.kind === current || schemes.includes(entry.kind);
    });
}

/** The kind a level carries; absent and `{ inherit: true }` both defer upward. */
export function kindOf(auth: AuthConfig | undefined): AuthKind {
    if (auth === undefined || !('type' in auth)) {
        return 'inherit';
    }

    return auth.type;
}

/** The kinds that ask a server for a token, which the window then holds for the level. */
export function asksForToken(kind: AuthKind): boolean {
    return kind === 'oauth2-client-credentials' || kind === 'oauth2-code-pkce';
}
