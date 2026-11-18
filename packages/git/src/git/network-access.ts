/**
 * Where a network call goes and what it may present. The token is a separate field and never
 * part of the url: the url is stored, logged and shown, the token is none of those.
 */
export type NetworkAccess = {
    url: string;
    token?: string | undefined;
    /** Who the token belongs to. Hosts that take a token as a password ignore the name. */
    username?: string | undefined;
};

/** The name hosts accept for a token that belongs to no particular user. */
const DEFAULT_USERNAME = 'oauth2';

/** Git never waits for a keyboard that nobody is at: a missing credential is a plain failure. */
const NO_PROMPT = { GIT_TERMINAL_PROMPT: '0' };

/**
 * The environment one network call of git runs with. A token travels as a header scoped to the
 * url it was given for, so it reaches that host and no other, and it lives in the environment of
 * that single process: not in argv, where the process list shows it, and not in `.git/config`,
 * where it would outlive the call. Ssh and unauthenticated urls rely on the credentials of the
 * system, so they get nothing but the guarantee that git will not ask.
 */
export function networkEnv(access: NetworkAccess): Record<string, string> {
    const scope = scopeOf(access.url);

    if (access.token === undefined || access.token === '' || scope === null) {
        return { ...NO_PROMPT };
    }

    const user = access.username ?? DEFAULT_USERNAME;
    const basic = Buffer.from(`${user}:${access.token}`, 'utf8').toString('base64');

    return {
        ...NO_PROMPT,
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: `http.${scope}.extraHeader`,
        GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`,
    };
}

/** Only http(s) carries a header, and the scope is the url without whatever it was signed with. */
function scopeOf(url: string): string | null {
    try {
        const parsed = new URL(url);

        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return null;
        }

        parsed.username = '';
        parsed.password = '';

        return parsed.toString();
    } catch {
        return null;
    }
}
