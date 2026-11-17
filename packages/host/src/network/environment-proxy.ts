import { hostMatches } from './host-matches.js';

/** The variables of the process, as `process.env` has them. */
export type ProcessEnvironment = Readonly<Record<string, string | undefined>>;

const SECURE = new Set(['https:', 'wss:']);

/** The lower-case spelling first, the way curl reads them; the upper-case one after. */
function variable(env: ProcessEnvironment, name: string): string | undefined {
    const value = env[name.toLowerCase()] ?? env[name.toUpperCase()];

    return value === undefined || value.trim() === '' ? undefined : value.trim();
}

/** `NO_PROXY` the way curl reads it: `*` is everything, a name covers itself and what is under it. */
function isExcluded(env: ProcessEnvironment, target: URL): boolean {
    const entries = (variable(env, 'no_proxy') ?? '')
        .split(/[\s,]+/u)
        .filter((entry) => entry !== '');

    return entries.some((entry) => {
        if (entry === '*') {
            return true;
        }

        const bare = entry.replace(/^\*?\.?/u, '');

        return hostMatches(bare, target) || hostMatches(`.${bare}`, target);
    });
}

/**
 * The proxy the environment of the process names for a url: `HTTPS_PROXY` for a secure one,
 * `HTTP_PROXY` for the rest, `ALL_PROXY` when the first says nothing, none for what
 * `NO_PROXY` leaves out. A value written without a scheme is an HTTP proxy, as curl reads it.
 */
export function environmentProxyOf(env: ProcessEnvironment, target: URL): string | undefined {
    const named = variable(env, SECURE.has(target.protocol) ? 'https_proxy' : 'http_proxy');
    const value = named ?? variable(env, 'all_proxy');

    if (value === undefined || isExcluded(env, target)) {
        return undefined;
    }

    return value.includes('://') ? value : `http://${value}`;
}
