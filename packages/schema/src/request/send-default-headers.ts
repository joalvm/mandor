/**
 * The headers a send lays down when the user wrote none, in the order they leave: what makes
 * a request solid on the wire — what it takes back, the compression it undoes, a fresh read,
 * and the name it goes by. The table of headers reads the same list, so what is hidden is
 * what goes out. `host`, `content-length` and `connection` are not here: the layer that dials
 * computes those, and the table says them as computed on send.
 */
export const SEND_DEFAULT_HEADERS: readonly (readonly [string, string])[] = [
    ['accept', '*/*'],
    ['accept-encoding', 'gzip, deflate, br, zstd'],
    ['cache-control', 'no-cache'],
    ['user-agent', 'Mandor/1.0'],
];

/**
 * The headers of the request with the defaults beside them: what the user wrote stands,
 * matched without case — a name they typed is what they meant, and the default stays home.
 */
export function withSendDefaults(
    headers: readonly (readonly [string, string])[],
): [string, string][] {
    const written = new Set(headers.map(([name]) => name.toLowerCase()));

    return [...headers, ...SEND_DEFAULT_HEADERS.filter(([name]) => !written.has(name))].map(
        ([name, value]) => [name, value],
    );
}
