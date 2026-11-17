import { describe, expectTypeOf, it } from 'vitest';

import type { AuthConfig, ConcreteAuth } from '../../src/auth/auth-config.js';

describe('AuthConfig', () => {
    it('admits exactly the two shapes: inherit and one concrete scheme', () => {
        expectTypeOf<AuthConfig>().toEqualTypeOf<{ inherit: true } | ConcreteAuth>();
    });

    it('narrows every concrete scheme by its type, the two OAuth2 flows among them', () => {
        expectTypeOf<ConcreteAuth['type']>().toEqualTypeOf<
            | 'none'
            | 'basic'
            | 'bearer'
            | 'apikey'
            | 'digest'
            | 'awsv4'
            | 'oauth2-client-credentials'
            | 'oauth2-code-pkce'
        >();
    });
});
