import type { RequestLine } from '@mandor/schema';

/** One path parameter a document declares: its name and the value it keeps apart. */
export type PathParamRow = { name: string; value: string };

export type PathParams = { url: string; lines: RequestLine[] };

function escaped(name: string): string {
    return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Insomnia and Bruno write a path parameter `:name` in the url and keep its value apart; Mandor
 * writes `{name}` and keeps the value in `pathParams`. Only the names the request declares are
 * rewritten: a `:` anywhere else in a url is a port or part of the text.
 */
export function pathParamsOf(url: string, rows: readonly PathParamRow[]): PathParams {
    const named = rows.filter((row) => row.name !== '');
    const rewritten = named.reduce(
        (text, row) =>
            text.replace(
                new RegExp(`(^|/):${escaped(row.name)}(?=[/?#]|$)`, 'g'),
                (_, lead: string) => `${lead}{${row.name}}`,
            ),
        url,
    );

    return {
        url: rewritten,
        lines: named.map((row) => ({ key: row.name, value: row.value, enabled: true })),
    };
}
