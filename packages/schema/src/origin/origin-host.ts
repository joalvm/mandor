/**
 * The hosts the app recognizes, and the generic one everything else gets. Closed on purpose:
 * each known host has its own glyph and its own color, and a name outside this table would
 * have neither.
 */
export const ORIGIN_HOSTS = ['github', 'gitlab', 'bitbucket', 'azure-devops', 'generic'] as const;

export type OriginHost = (typeof ORIGIN_HOSTS)[number];

const BY_HOSTNAME: Readonly<Record<string, OriginHost>> = {
    'bitbucket.org': 'bitbucket',
    'dev.azure.com': 'azure-devops',
    'github.com': 'github',
    'gitlab.com': 'gitlab',
};

/** Names the host a url points to. Anything unrecognized is the generic host. */
export function originHostOf(url: string | undefined): OriginHost {
    const hostname = hostnameOf(url);

    if (hostname === undefined) {
        return 'generic';
    }

    if (hostname.endsWith('.visualstudio.com')) {
        return 'azure-devops';
    }

    return BY_HOSTNAME[hostname] ?? 'generic';
}

/**
 * The scp form (`git@host:org/repo`) is not a URL and the URL class refuses it, so its host
 * comes from between the `@` and the `:`. Everything else parses as a URL.
 */
function hostnameOf(url: string | undefined): string | undefined {
    if (url === undefined) {
        return undefined;
    }

    try {
        return new URL(url).hostname;
    } catch {
        return /^[^@/\s]+@([^@/:\s]+):/.exec(url)?.[1];
    }
}
