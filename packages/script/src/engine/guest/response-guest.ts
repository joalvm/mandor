/**
 * `mandor.response`: what the answer gave, read only. A body over the size a script may read, or
 * one that is not text, is not in the snapshot: `text()` and `json()` give `undefined` and say so
 * once. `newResponse` builds one from the parts of an answer (`status`, `headers`, `text`,
 * `timeMs`, shown as `time`), for `mandor.response` and for what `mandor.sendRequest` gives back.
 * `to` asserts about it in the words of Postman (`RESPONSE_ASSERTION_GUEST`). Needs `I`,
 * `SNAPSHOT`, `warnLine`, `newLines`, `utf8Bytes` and `responseAssertion`.
 */
export const RESPONSE_GUEST = String.raw`
// The bytes of the response as Postman counts them: each header line, then the body.
function sizeOf(source) {
    const headers = source.headers || [];
    let bytes = source.bodyBytes || 0;

    for (let index = 0; index < headers.length; index += 1) {
        bytes += utf8Bytes(headers[index].name + ': ' + headers[index].value + '\r\n').length;
    }

    return bytes;
}

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
    I.define(api, 'time', { enumerable: true, get: () => source.timeMs });
    I.define(api, 'to', { enumerable: true, get: () => responseAssertion(api, false, () => sizeOf(source)) });

    return api;
}

const responseApi = newResponse(
    SNAPSHOT.response || { status: 0, headers: [], bodyBytes: 0, timeMs: 0 },
);
`;
