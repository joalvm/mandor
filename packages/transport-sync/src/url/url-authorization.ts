type Header = readonly [string, string];

function decoded(text: string): string {
    try {
        return decodeURIComponent(text);
    } catch {
        return text;
    }
}

/**
 * The headers of a hop to this URL. `https://user:secret@host` says the same as a Basic
 * authorization and travels as one, as it does in curl, Postman and Insomnia; an `Authorization`
 * the request wrote wins. It is worked out for each hop and never joins the headers of the
 * request: a redirect to another origin carries no credential of the one it left.
 */
export function headersForUrl(headers: readonly Header[], url: URL): readonly Header[] {
    const written = headers.some(([name]) => name.toLowerCase() === 'authorization');

    if ((url.username === '' && url.password === '') || written) {
        return headers;
    }

    const pair = `${decoded(url.username)}:${decoded(url.password)}`;

    return [...headers, ['authorization', `Basic ${Buffer.from(pair).toString('base64')}`]];
}
