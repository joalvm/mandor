/**
 * The path of the wire a request's url answers to, as an OpenAPI path writes it: the query and
 * the fragment are the rows' business, the template of the environment and the scheme plus host
 * are the document's, and what remains is the route — with a `/` of its own, because a path
 * without one is no path.
 */
export function pathOfUrl(url: string): string {
    const rest = url.split(/[?#]/, 1)[0] ?? '';

    const template = rest.startsWith('{{');
    const close = template ? rest.indexOf('}}') : -1;

    const withoutPrefix =
        close !== -1 ? rest.slice(close + 2) : rest.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/iu, '');

    const slash = withoutPrefix.indexOf('/');

    if (slash === -1) {
        return withoutPrefix === '' ? '/' : `/${withoutPrefix}`;
    }

    return withoutPrefix.slice(slash);
}
