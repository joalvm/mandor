import type { RequestLine } from '@mandor/schema';

/**
 * The url a person reads and the query the request carries are one line, not two fields: the
 * pairs that go out hang from the url after its `?`, spelled as they travel. What the window
 * shows is literal — the variables stand as written — because encoding is the sender's to do
 * on its way out, not the reader's.
 *
 * Editing the line from the bar hands the whole query over: what the line says is what there
 * is. A pair with no `=` keeps its value empty; one with nothing after the `?` is a pair of a
 * name and no value.
 */
export function composeUrlOf(url: string, query: readonly RequestLine[]): string {
    const sending = query.filter((line) => line.enabled);

    if (sending.length === 0) {
        return url;
    }

    const spelled = sending
        .map((line) => (line.value === '' ? line.key : `${line.key}=${line.value}`))
        .join('&');

    return `${url}?${spelled}`;
}

/** The url and its pairs, split apart from the line the bar holds. */
export function splitUrlOf(text: string): { query: RequestLine[]; url: string } {
    const at = text.indexOf('?');

    if (at === -1) {
        return { query: [], url: text };
    }

    const query = text
        .slice(at + 1)
        .split('&')
        .filter((pair) => pair !== '')
        .map((pair) => {
            const equals = pair.indexOf('=');
            const key = equals === -1 ? pair : pair.slice(0, equals);
            const value = equals === -1 ? '' : pair.slice(equals + 1);

            return { enabled: true, key, value };
        });

    return { query, url: text.slice(0, at) };
}
