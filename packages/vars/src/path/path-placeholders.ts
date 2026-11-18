/** A `{name}` with single braces: `{{name}}` is a variable and is not ours. */
const PLACEHOLDER = /(?<!\{)\{([A-Za-z_][\w.-]*)\}(?!\})/g;

/** Where the path of a url starts and ends: after the authority, before the query or fragment. */
const PATH_OF_URL = /^((?:[a-z][a-z0-9+.-]*:\/\/[^/?#]*)?)([^?#]*)(.*)$/is;

/**
 * Replaces each `{name}` of the path of the url with what `replace` answers for it, which gets the
 * placeholder itself to answer with when it has nothing to put. The host, the query and the
 * fragment are not the path, so a brace there stays as written.
 */
export function mapPathPlaceholders(
    url: string,
    replace: (name: string, placeholder: string) => string,
): string {
    // The pattern matches every string, so the callback always runs and no fallback is needed.
    return url.replace(
        PATH_OF_URL,
        (_all, head: string, path: string, tail: string) =>
            `${head}${path.replace(PLACEHOLDER, (placeholder, name: string) => replace(name, placeholder))}${tail}`,
    );
}

/** The names the path of a url asks for, each once, in the order the path says them. */
export function pathPlaceholdersOf(url: string): string[] {
    const names = new Set<string>();

    mapPathPlaceholders(url, (name, placeholder) => {
        names.add(name);

        return placeholder;
    });

    return [...names];
}
