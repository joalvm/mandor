import type { ConcreteAuth } from '@mandor/schema';

/**
 * The auth schemes the handshake of a connection applies. The socket opens once: there is no
 * challenge to answer, as Digest needs, and no signer behind it, as an AWS signature needs.
 */
export const HANDSHAKE_SCHEMES: readonly ConcreteAuth['type'][] = [
    'none',
    'basic',
    'bearer',
    'apikey',
    'oauth2-client-credentials',
    'oauth2-code-pkce',
];
