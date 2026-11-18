import type { Cookie } from 'tough-cookie';

const SAME_SITES = ['strict', 'lax', 'none'] as const;

/** The three same-site rules a browser honors. */
type SameSite = (typeof SAME_SITES)[number];

/**
 * The same-site rule of a cookie, or nothing. A parse settles the case, but a jar read back from
 * disk keeps whatever was stored, so the rule is matched without regard to case and a word no
 * browser knows reads as no rule at all.
 */
export function sameSiteOf(cookie: Cookie): SameSite | undefined {
    const declared = cookie.sameSite?.toLowerCase();

    return SAME_SITES.find((rule) => rule === declared);
}
