import { URL } from 'node:url';

/**
 * Whether the renderer may follow a navigation. Mandor is one document that routes itself, so
 * anything leaving its origin is a way out of the sandbox, not a page the user asked for.
 */
export function navigationPolicy(url: string, appEntryUrl: string): 'allow' | 'block' {
    if (!URL.canParse(url) || !URL.canParse(appEntryUrl)) {
        return 'block';
    }

    const target = new URL(url);
    const entry = new URL(appEntryUrl);

    // Every file: URL has the opaque origin "null". Exact href comparison permits only the
    // packaged renderer, never another path on the machine.
    if (target.protocol === 'file:' || entry.protocol === 'file:') {
        return target.href === entry.href ? 'allow' : 'block';
    }

    if (target.origin !== entry.origin) {
        return 'block';
    }

    return 'allow';
}
