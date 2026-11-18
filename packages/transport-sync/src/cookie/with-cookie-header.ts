type Headers = readonly (readonly [string, string])[];

function isCookie([name]: readonly [string, string]): boolean {
    return name.toLowerCase() === 'cookie';
}

/**
 * The headers of a hop once the jar speaks: the `Cookie` written by hand, if it survived, and the
 * jar's after it, in one header as the wire expects. Nothing to add leaves the headers as they are.
 */
export function withCookieHeader(headers: Headers, fromJar: string | null): Headers {
    if (fromJar === null || fromJar === '') {
        return headers;
    }

    const own = headers.filter(isCookie).map(([, value]) => value);
    const rest = headers.filter((header) => !isCookie(header));

    return [...rest, ['Cookie', [...own, fromJar].join('; ')]];
}
