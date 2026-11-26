import type { CookieRow } from '@mandor/ipc';

/** One domain of the jar and the cookies it holds, as the dialog lists them. */
export type CookieDomain = { cookies: readonly CookieRow[]; domain: string };

/**
 * The host a typed text names: a bare domain, or the host of a URL pasted whole, without the dot
 * an old `Domain` attribute leads with. `null` for a text that names none.
 */
export function domainOf(text: string): string | null {
    const typed = text.trim().replace(/^\.+/u, '');

    if (typed === '') {
        return null;
    }

    const url = URL.parse(typed.includes('://') ? typed : `https://${typed}`);

    return url === null || url.hostname === '' ? null : url.hostname;
}

/**
 * The cookies of the jar by domain, in the order of the domains' names. A domain added in the
 * dialog that holds nothing yet stands among them, empty, so a first cookie can be written to it.
 */
export function cookieDomainsOf(
    cookies: readonly CookieRow[],
    added: readonly string[],
): CookieDomain[] {
    const byDomain = new Map<string, CookieRow[]>(added.map((domain) => [domain, []]));

    for (const cookie of cookies) {
        const held = byDomain.get(cookie.domain);

        if (held === undefined) {
            byDomain.set(cookie.domain, [cookie]);
        } else {
            held.push(cookie);
        }
    }

    return [...byDomain]
        .map(([domain, held]) => ({ cookies: held, domain }))
        .toSorted((one, other) => one.domain.localeCompare(other.domain));
}

/** The domains whose name holds what the field says; all of them while it says nothing. */
export function domainsMatching(
    domains: readonly CookieDomain[],
    text: string,
): readonly CookieDomain[] {
    const term = domainOf(text) ?? text.trim().toLowerCase();

    return term === '' ? domains : domains.filter(({ domain }) => domain.includes(term));
}

/** Whether the line open in the editor is the one of this cookie. */
export function isOpenIn(
    cookie: CookieRow,
    draft: { replaces?: Pick<CookieRow, 'domain' | 'name' | 'path'> | undefined } | null,
): boolean {
    const opened = draft?.replaces;

    return (
        opened?.domain === cookie.domain &&
        opened.path === cookie.path &&
        opened.name === cookie.name
    );
}

/**
 * The line a new cookie of a domain starts from, as Postman writes it: the first `Cookie_N` the
 * domain does not hold, at the root, kept a year. Without `Domain` it stays on that host alone.
 */
export function newCookieLine(held: readonly CookieRow[], now: Date): string {
    const names = new Set(held.map((cookie) => cookie.name));
    let index = 1;

    while (names.has(`Cookie_${String(index)}`)) {
        index += 1;
    }

    const end = new Date(now);

    end.setUTCFullYear(end.getUTCFullYear() + 1);

    return `Cookie_${String(index)}=value; Path=/; Expires=${end.toUTCString()}`;
}
