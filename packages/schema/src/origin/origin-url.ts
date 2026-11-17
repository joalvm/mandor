import { originHostOf, type OriginHost } from './origin-host.js';
import { OriginUrlError } from './origin-url-error.js';

export type SplitOriginUrl = {
    /** The url with any embedded credentials removed: what may be written to disk. */
    url: string;
    host: OriginHost;
    /** The secret the url carried, bound for the system store and never for a file. */
    token?: string | undefined;
};

// No library does this: git-url-parse (16.1.0, MIT, last published 2025-04) has not seen a
// release in over a year, and four url shapes do not justify it. https and ssh are the URL
// class of the runtime; the scp form is one capture group. Neither its user nor its host
// starts with a dash: git and ssh would read that as one of their options.
const SCP_FORM = /^[^@/\s-][^@/\s]*@[^@/:\s-][^@/:\s]*:\S+$/;

/** The schemes that can name an origin. `file` is one: a bare repo on a mounted share is a real one. */
const ORIGIN_PROTOCOLS = ['https:', 'ssh:', 'file:'];

/**
 * Whether a URL can name an origin: a scheme of the list, and no user or host that starts with
 * a dash, the same rule the scp form keeps. The runtime parses `ssh://-oProxyCommand=…/repo`
 * as a host, and ssh would read it as an option.
 */
function namesOrigin(parsed: URL): boolean {
    const readsAsOption = parsed.hostname.startsWith('-') || parsed.username.startsWith('-');

    return ORIGIN_PROTOCOLS.includes(parsed.protocol) && !readsAsOption;
}

/**
 * Whether a raw string can name an origin: an https or ssh URL, the scp form of ssh, which is
 * not a URL and still names one, or a file URL, which is how a bare repo on this machine or on
 * a mounted share names itself.
 */
export function isOriginUrl(raw: string): boolean {
    if (SCP_FORM.test(raw)) {
        return true;
    }

    try {
        return namesOrigin(new URL(raw));
    } catch {
        return false;
    }
}

/**
 * Splits a raw origin url into what may be persisted and what may not. Credentials embedded as
 * `user:token@` are lifted out: the token is returned apart and the url is given back clean.
 */
export function splitOriginUrl(raw: string): SplitOriginUrl {
    const trimmed = raw.trim();

    if (SCP_FORM.test(trimmed)) {
        return { url: trimmed, host: originHostOf(trimmed) };
    }

    let parsed: URL;

    try {
        parsed = new URL(trimmed);
    } catch {
        throw new OriginUrlError(raw);
    }

    if (!namesOrigin(parsed)) {
        throw new OriginUrlError(raw);
    }

    const token = parsed.password === '' ? undefined : tokenOf(parsed.password);

    parsed.username = '';
    parsed.password = '';

    return { url: parsed.toString(), host: originHostOf(parsed.toString()), token };
}

/** Runs of escapes, decoded together: one character of UTF-8 can take several of them. */
const ESCAPES = /(?:%[0-9a-f]{2})+/gi;

/**
 * The token as git reads it out of a url: its escapes decoded, and a `%` that starts none kept as
 * one more character. A run that is no UTF-8 stays as it was written, for the same reason.
 */
function tokenOf(password: string): string {
    return password.replace(ESCAPES, (run) => {
        try {
            return decodeURIComponent(run);
        } catch {
            return run;
        }
    });
}
