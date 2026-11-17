import type { AuthConfig } from './auth-config.js';
import type { AuthPlace } from './auth-place.js';

/** One level of the auth chain, named so the interface can say who decides. */
export type AuthChainLevel = {
    place: AuthPlace;
    /** The visible name of the folder or workspace this level comes from. */
    name: string;
    /** Absent is the same as `{ inherit: true }`: the level defers upward. */
    auth?: AuthConfig | undefined;
};
