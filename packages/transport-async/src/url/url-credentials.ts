type Dialed = {
    uri: string;
    headers: Record<string, string> | undefined;
};

function decoded(text: string): string {
    try {
        return decodeURIComponent(text);
    } catch {
        return text;
    }
}

/**
 * The address and headers a Socket.IO client dials with. Its client drops the credentials of
 * `http://user:secret@host` without a word, where a websocket hands them to the handshake: here
 * they become the Basic authorization they stand for, and an `Authorization` the connection
 * wrote wins.
 */
export function credentialsAsHeader(
    uri: string,
    headers: Record<string, string> | undefined,
): Dialed {
    const url = new URL(uri);

    if (url.username === '' && url.password === '') {
        return { uri, headers };
    }

    const pair = `${decoded(url.username)}:${decoded(url.password)}`;
    const written = Object.keys(headers ?? {}).some(
        (name) => name.toLowerCase() === 'authorization',
    );

    url.username = '';
    url.password = '';

    return {
        uri: url.href,
        headers: written
            ? headers
            : { ...headers, Authorization: `Basic ${Buffer.from(pair).toString('base64')}` },
    };
}
