/** The port a url dials when it names none, by its scheme. */
const DEFAULT_PORTS: Record<string, string> = {
    'http:': '80',
    'ws:': '80',
    'https:': '443',
    'wss:': '443',
};

/** The host and the port a pattern names; an IPv6 address keeps its brackets, as a url has it. */
function partsOf(pattern: string): { host: string; port: string | undefined } {
    const close = pattern.startsWith('[') ? pattern.indexOf(']') + 1 : 0;
    const colon = pattern.indexOf(':', close);

    if (colon === -1) {
        return { host: pattern.toLowerCase(), port: undefined };
    }

    return { host: pattern.slice(0, colon).toLowerCase(), port: pattern.slice(colon + 1) };
}

/** `*` names every host, `*.x` the hosts under x, `.x` x and the hosts under it, else x alone. */
function nameMatches(pattern: string, host: string): boolean {
    if (pattern === '*') {
        return true;
    }

    if (pattern.startsWith('*.')) {
        return host.endsWith(pattern.slice(1));
    }

    if (pattern.startsWith('.')) {
        return host === pattern.slice(1) || host.endsWith(pattern);
    }

    return host === pattern;
}

/**
 * Whether a host the settings name is the one a request dials: the name by the rules of the
 * pattern, and the port when the pattern names one — the default of the scheme counts as named.
 */
export function hostMatches(pattern: string, target: URL): boolean {
    const { host, port } = partsOf(pattern.trim());
    const targetPort = target.port === '' ? DEFAULT_PORTS[target.protocol] : target.port;

    return (
        nameMatches(host, target.hostname.toLowerCase()) &&
        (port === undefined || port === targetPort)
    );
}
