import type { AuthConfig, ConcreteAuth } from '@mandor/schema';

/** The scheme that rules, and the level that decided: 0 is the closest, null means every level inherited. */
export type EffectiveAuth = {
    auth: ConcreteAuth;
    from: number | null;
};

/**
 * Walks the chain from the closest level to the workspace: the first one that carries a scheme
 * instead of inheriting rules. Above the workspace, inheriting means no auth.
 */
export function effectiveAuth(levels: readonly (AuthConfig | undefined)[]): EffectiveAuth {
    for (let index = 0; index < levels.length; index += 1) {
        const level = levels[index];

        if (level !== undefined && 'type' in level) {
            return { auth: level, from: index };
        }
    }

    return { auth: { type: 'none' }, from: null };
}
