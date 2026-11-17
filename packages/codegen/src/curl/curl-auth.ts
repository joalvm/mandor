import type { AuthConfig } from '@mandor/schema';

import type { CurlArg } from './curl-args.js';
import type { UrlUser } from './curl-url.js';

function lastValue(args: readonly CurlArg[], name: string): string | null {
    return args.findLast((arg) => arg.name === name)?.value ?? null;
}

function basicOf(text: string): AuthConfig {
    const colon = text.indexOf(':');

    return colon < 0
        ? { type: 'basic', username: text, password: '' }
        : { type: 'basic', username: text.slice(0, colon), password: text.slice(colon + 1) };
}

/**
 * The auth the command says: the last `-u`, else its `--oauth2-bearer`, else the user its URL
 * names, as curl would prefer them. Written as it came: what the person wrote is theirs.
 */
export function authOf(args: readonly CurlArg[], urlUser?: UrlUser): AuthConfig | undefined {
    const user = lastValue(args, 'user');
    const bearer = lastValue(args, 'oauth2-bearer');

    if (user !== null) {
        return basicOf(user);
    }

    if (bearer !== null) {
        return { type: 'bearer', token: bearer };
    }

    return urlUser && { type: 'basic', ...urlUser };
}
