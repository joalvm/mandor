/** root → repo path → text the window holds, or `null` when the path is not there for it. */
const known = new Map<string, Map<string, string | null>>();

/**
 * Notes what the window believes a file says. Whatever host hands the window — a read, or the
 * text of a write the window made — is remembered here, so a later write of the window can be
 * told apart from a change that happened on disk without it: the window never says which
 * version it edited, and it does not have to.
 */
export function rememberText(root: string, path: string, text: string | null): void {
    const texts = known.get(root) ?? new Map<string, string | null>();

    texts.set(path, text);
    known.set(root, texts);
}

/**
 * What the window believes `path` says: its text, `null` when it believes there is no such file,
 * and `undefined` when it never heard of it — the one case where nothing can have been missed.
 */
export function knownText(root: string, path: string): string | null | undefined {
    return known.get(root)?.get(path);
}

/**
 * Notes that `path` is gone for the window, and everything that lived under it: a folder taken
 * away takes its files, and the window must not believe in any of them.
 */
export function rememberGone(root: string, path: string): void {
    const texts = known.get(root) ?? new Map<string, string | null>();

    for (const each of [...texts.keys()].filter((key) => key.startsWith(`${path}/`))) {
        texts.set(each, null);
    }

    texts.set(path, null);
    known.set(root, texts);
}

/** Forgets every path of the repo: the origin it belonged to is no longer the window's. */
export function forgetTexts(root: string): void {
    known.delete(root);
}
