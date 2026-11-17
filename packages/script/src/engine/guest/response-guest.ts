/**
 * `response`: what the answer gave, read only. A body over the size a script may read, or one that
 * is not text, is not in the snapshot: `text()` and `json()` give `undefined` and say so once.
 * `newResponse` builds one from the parts of an answer (`status`, `headers`, `text`, `timeMs`), for
 * `response` and for what `sendRequest` gives back. Needs `I`, `SNAPSHOT`, `warnLine` and
 * `newLines`.
 */
export const RESPONSE_GUEST = String.raw`
function newResponse(source) {
    let said = false;
    const text = () => {
        if (source.text === undefined && !said) {
            said = true;
            noticeLine('response-body-unreadable');
        }

        return source.text;
    };
    const api = {
        headers: newLines(source.headers, { ignoreCase: true }),
        text,
        json() {
            const body = text();

            return body === undefined ? undefined : I.parse(body);
        },
    };

    I.define(api, 'status', { enumerable: true, get: () => source.status });
    I.define(api, 'timeMs', { enumerable: true, get: () => source.timeMs });

    return api;
}

const responseApi = newResponse(
    SNAPSHOT.response || { status: 0, headers: [], bodyBytes: 0, timeMs: 0 },
);
`;
