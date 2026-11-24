/** A scheme written out in front of its authority: `https://`, `ws://`, `ftp://`. */
const NAMES_SCHEME = /^[a-z][a-z\d+.-]*:\/\//iu;

/**
 * The url as it is dialed: one typed without its scheme takes the default of the transport,
 * as a browser bar and Postman do, so `localhost:81` reaches `http://localhost:81`. A url that
 * names its scheme keeps it, whichever: refusing one that is not spoken is the transport's
 * call. Nothing else is repaired: an empty url, or a path with no host, stays as it was.
 */
export function withDefaultScheme(url: string, scheme: string): string {
    const typed = url.trim();

    if (typed === '' || NAMES_SCHEME.test(typed)) {
        return typed;
    }

    if (typed.startsWith('//')) {
        return `${scheme}:${typed}`;
    }

    return typed.startsWith('/') ? typed : `${scheme}://${typed}`;
}
