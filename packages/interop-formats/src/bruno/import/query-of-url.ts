import type { BrunoRow } from '../document/bruno-tree.js';

export type UrlQuery = { url: string; rows: BrunoRow[] };

/** A part of a query string as it reads: percent-escapes undone, and left as written if broken. */
function decoded(part: string): string {
    try {
        return decodeURIComponent(part);
    } catch {
        return part;
    }
}

function pairOf(part: string): BrunoRow {
    const cut = part.indexOf('=');

    return {
        name: decoded(cut < 0 ? part : part.slice(0, cut)),
        value: cut < 0 ? '' : decoded(part.slice(cut + 1)),
        disabled: false,
    };
}

/**
 * Bruno keeps the query inside the url and lists it again as parameters. Mandor keeps the url
 * without it, so the rows are the listed ones plus whatever the url holds that no enabled row
 * already says.
 */
export function queryOfUrl(url: string, rows: readonly BrunoRow[]): UrlQuery {
    const cut = url.indexOf('?');

    if (cut < 0) {
        return { url, rows: [...rows] };
    }

    const written = url
        .slice(cut + 1)
        .split('&')
        .filter((part) => part !== '')
        .map(pairOf);
    const missing = written.filter(
        (pair) =>
            !rows.some(
                (row) => !row.disabled && row.name === pair.name && row.value === pair.value,
            ),
    );

    return { url: url.slice(0, cut), rows: [...rows, ...missing] };
}
