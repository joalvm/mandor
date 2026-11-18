import { URL } from 'node:url';

/** Hands a url to whatever the machine opens it with. `shell.openExternal`, in main. */
export type ExternalOpener = (url: string) => void;

// The only two schemes that reach the machine. `http:` stays out with `file:` and
// `javascript:`: a link worth following is worth following over TLS.
const EXTERNAL_SCHEMES = ['https:', 'mailto:'];

/**
 * Builds the handler for `setWindowOpenHandler`. Mandor never opens a second renderer, so the
 * answer is always deny; a link the user meant to follow goes to their own browser instead.
 */
export function windowOpenHandler(
    openExternal: ExternalOpener,
): (details: { url: string }) => { action: 'deny' } {
    return ({ url }) => {
        if (isExternalLink(url)) {
            openExternal(url);
        }

        return { action: 'deny' };
    };
}

function isExternalLink(url: string): boolean {
    if (!URL.canParse(url)) {
        return false;
    }

    return EXTERNAL_SCHEMES.includes(new URL(url).protocol);
}
