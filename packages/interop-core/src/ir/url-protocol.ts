const SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i;

/**
 * What speaks at an address, as the scheme says it. A url with no scheme of its own (`/v1`, or
 * `{scheme}://host`) is the web's by default. One rule for the way in and the way out, or a
 * document differs from itself after a round trip.
 */
export function urlProtocolOf(url: string): string {
    return SCHEME.exec(url)?.[1]?.toLowerCase() ?? 'http';
}
