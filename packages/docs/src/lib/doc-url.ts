/** The only schemes a doc may send the reader to. Anything else is dropped without a word. */
const LINK_SCHEMES = ['mandor', 'http', 'https'];

/** Either separator: a doc written on Windows spells its paths with the other one. */
const SEPARATOR = /[/\\]/u;

const NOT_FOUND = -1;

/** An attribute with nothing left in it. What is drawn for it is decided by the component. */
const DROPPED = '';

/**
 * The last word on every URL a doc carries, run after the tree was sanitized. Sanitizing reads
 * the scheme; this reads the path as well, which is where `..` lives, so it is the only place
 * that sees both halves of a URL at once.
 */
export function docUrl(url: string, key: string): string {
    if (key === 'src') {
        return insideRepo(url) ? url : DROPPED;
    }

    return followable(url) ? url : DROPPED;
}

/** A destination the app knows how to reach, or a path against the doc itself. */
function followable(url: string): boolean {
    const scheme = schemeOf(url);

    if (scheme === '') {
        return !hostRelative(url);
    }

    return LINK_SCHEMES.includes(scheme);
}

/**
 * An image is loaded with nobody asking for it, so the only one drawn is one that arrived with
 * the repo: a path against the doc, with no scheme, no host, and no `..` to climb out of the
 * workspace with.
 */
function insideRepo(url: string): boolean {
    return (
        schemeOf(url) === '' &&
        !hostRelative(url) &&
        !url.startsWith('/') &&
        !url.split(SEPARATOR).includes('..')
    );
}

/**
 * The scheme of a URL, read the way a browser reads one: what stands before the first colon,
 * unless a `/`, `?` or `#` got there first, in which case the colon belongs to a path and the
 * URL is relative.
 *
 * Nothing is stripped before the comparison. A `javascript:` written with a newline inside it is
 * still run by a browser, so here it has to fail to look like a relative path.
 */
function schemeOf(url: string): string {
    const colon = url.indexOf(':');
    const earlier = [url.indexOf('/'), url.indexOf('?'), url.indexOf('#')];

    if (colon === NOT_FOUND || earlier.some((at) => at !== NOT_FOUND && at < colon)) {
        return '';
    }

    return url.slice(0, colon).toLowerCase();
}

/** `//host/path` names a host and borrows the scheme of the page. A doc names no hosts. */
function hostRelative(url: string): boolean {
    return url.startsWith('//');
}
