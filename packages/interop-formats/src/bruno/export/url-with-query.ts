import type { RequestLine } from '@mandor/schema';

/**
 * Bruno keeps the query inside the url and lists it again as parameters: the url carries the
 * enabled rows, the way Bruno sends it.
 */
export function urlWithQuery(url: string, query: readonly RequestLine[]): string {
    const sent = query
        .filter((line) => line.key !== '' && line.enabled)
        .map((line) => `${line.key}=${line.value}`);

    if (sent.length === 0) {
        return url;
    }

    return `${url}${url.includes('?') ? '&' : '?'}${sent.join('&')}`;
}
