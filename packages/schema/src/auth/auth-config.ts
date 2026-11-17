import type { ApiKeyPlacement } from './api-key-placement.js';

/** The level defers to the one above it. Absent auth means the same. */
type InheritAuth = { inherit: true };

type NoAuth = { type: 'none' };

export type BasicAuth = { type: 'basic'; username: string; password: string };

/** A prefix the file wrote replaces `Bearer`; absent means the standard one. */
export type BearerAuth = { type: 'bearer'; token: string; prefix?: string | undefined };

export type ApiKeyAuth = {
    type: 'apikey';
    name: string;
    value: string;
    in: ApiKeyPlacement;
};

/** The pair a server asks for with a Digest challenge: the request goes, a 401 answers, it goes again. */
export type DigestAuth = { type: 'digest'; username: string; password: string };

/**
 * The request is signed with an AWS key, as Signature Version 4 asks. Region and service left
 * out are read from the host the request goes to; a session token rides beside temporary keys.
 */
export type AwsSigV4Auth = {
    type: 'awsv4';
    accessKeyId: string;
    secretAccessKey: string;
    region?: string | undefined;
    service?: string | undefined;
    sessionToken?: string | undefined;
};

/**
 * The token comes from the token endpoint with the credentials of the client alone: no user in
 * the middle. `clientAuth` says where the secret travels, in the Basic header or in the body.
 */
export type OAuth2ClientCredentials = {
    type: 'oauth2-client-credentials';
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    clientAuth: 'basic' | 'body';
    scope?: string | undefined;
    audience?: string | undefined;
};

/**
 * The token comes from the user's browser, with PKCE. A client without a secret is a public
 * one. `redirectPort` pins the loopback port for providers that register it; absent, any free
 * port serves.
 */
export type OAuth2CodePkce = {
    type: 'oauth2-code-pkce';
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret?: string | undefined;
    scope?: string | undefined;
    redirectPort?: number | undefined;
};

/** A scheme that decides at this level. */
export type ConcreteAuth =
    | NoAuth
    | BasicAuth
    | BearerAuth
    | ApiKeyAuth
    | DigestAuth
    | AwsSigV4Auth
    | OAuth2ClientCredentials
    | OAuth2CodePkce;

/**
 * One level of the auth chain: the connection or the request, a folder, or the workspace. The
 * strings hold templates — `{{var}}` — and resolve on the way out, never at rest.
 */
export type AuthConfig = InheritAuth | ConcreteAuth;
