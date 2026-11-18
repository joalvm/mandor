/**
 * `sendRequest({ url, method, headers, body })`: a promise for the answer, which main fetches. The
 * guest only builds the text it sends and reads the text main answers with: a failed request
 * rejects with the reason, and an answer is a `response` like the one of `onResponse`. The way out
 * is held here and removed from the global before the script runs, so the script has no access
 * to it but through this function. Needs `I`, `SEND_NAME`, `show` and `newResponse`.
 */
export const SEND_GUEST = String.raw`
const HOST_SEND = globalThis[SEND_NAME];

delete globalThis[SEND_NAME];

function headerList(headers) {
    const list = [];

    if (headers === undefined || headers === null) {
        return list;
    }

    if (I.isArray(headers)) {
        for (let index = 0; index < headers.length; index += 1) {
            I.push(list, { name: I.toText(headers[index].name), value: show(headers[index].value) });
        }

        return list;
    }

    const names = I.keys(headers);

    for (let index = 0; index < names.length; index += 1) {
        I.push(list, { name: names[index], value: show(headers[names[index]]) });
    }

    return list;
}

function sendPayload(options) {
    if (typeof options !== 'object' || options === null || typeof options.url !== 'string') {
        throw new I.TypeError('sendRequest expects an object with the url of the request');
    }

    return I.stringify({
        url: options.url,
        method: options.method === undefined ? 'GET' : I.toText(options.method),
        headers: headerList(options.headers),
        body: options.body === undefined ? undefined : show(options.body),
    });
}

function answerOf(reply) {
    const answer = I.parse(reply);

    if (!answer.ok) {
        throw new I.Error(answer.message);
    }

    return newResponse(answer);
}

function sendRequest(options) {
    return new I.Promise((resolve, reject) => {
        try {
            if (HOST_SEND === undefined) {
                throw new I.Error('sendRequest is not available here');
            }

            I.then(
                HOST_SEND(sendPayload(options)),
                (reply) => {
                    try {
                        resolve(answerOf(reply));
                    } catch (thrown) {
                        reject(thrown);
                    }
                },
                reject,
            );
        } catch (thrown) {
            reject(thrown);
        }
    });
}
`;
