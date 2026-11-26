import type { Language } from '@mandor/i18n';
import type { ResponseCookie } from '@mandor/schema';

/** A cookie as a `Cookie` header would carry it, and as a copy of it reads. */
export function cookiePairOf(cookie: ResponseCookie): string {
    return `${cookie.name}=${cookie.value}`;
}

/**
 * When a cookie stops going out, as a day and an hour of the interface's language; `null` for a
 * cookie of the session, which names no end. A date written in a form no clock reads is shown as
 * it came.
 */
export function cookieExpiryOf(expires: string | undefined, language: Language): string | null {
    if (expires === undefined) {
        return null;
    }

    const date = new Date(expires);

    if (Number.isNaN(date.getTime())) {
        return expires;
    }

    return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
        date,
    );
}
