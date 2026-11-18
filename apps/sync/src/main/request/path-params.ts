import { mapPathPlaceholders } from '@mandor/vars';

export type FilledPath = { ok: true; url: string } | { ok: false; name: string };

/**
 * Puts the value of each `{name}` of the path of the url, encoded to sit inside one segment. The
 * first row of a name wins; a name with no row is the answer, and the send refuses by it.
 */
export function fillPathParams(url: string, rows: readonly [string, string][]): FilledPath {
    const missing: string[] = [];

    const filled = mapPathPlaceholders(url, (name, placeholder) => {
        const row = rows.find(([key]) => key === name);

        if (row === undefined) {
            missing.push(name);

            return placeholder;
        }

        return encodeURIComponent(row[1]);
    });
    const [first] = missing;

    return first === undefined ? { ok: true, url: filled } : { ok: false, name: first };
}
