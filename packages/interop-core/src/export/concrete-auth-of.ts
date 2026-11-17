import type { AuthConfig, ConcreteAuth } from '@mandor/schema';

/** The auth that decides at this level; absent and `{ inherit: true }` both defer. */
export function concreteAuthOf(auth: AuthConfig | undefined): ConcreteAuth | undefined {
    return auth === undefined || 'inherit' in auth ? undefined : auth;
}
