/**
 * `mandor.request`: the request as the snapshot has it, with `{{var}}` as the literal text it is. Reading
 * gives what the snapshot said or what the script wrote after; writing leaves an effect, only for
 * the fields the event lets it write (`WRITES`), and for a body of a kind a script can read and
 * write as text (`json`, `text`, `xml`, `none`). Anything else is said in a line and does nothing.
 * Needs `I`, `SNAPSHOT`, `WRITES`, `show`, `listHas`, `putEffect`, `warnLine` and `newLines`.
 */
export const REQUEST_GUEST = String.raw`
const REQUEST = SNAPSHOT.request || { url: '', method: '', headers: [], query: [] };
const BODY_TYPES = ['json', 'text', 'xml', 'none'];
const current = {
    url: REQUEST.url,
    method: REQUEST.method,
    body: REQUEST.body || { type: 'none', text: '' },
};

function canWrite(field) {
    if (listHas(WRITES, field)) {
        return true;
    }

    noticeLine('request-field-readonly', { field: 'mandor.request.' + field, event: SNAPSHOT.info.event });

    return false;
}

function textField(field) {
    return {
        enumerable: true,
        get: () => current[field],
        set: (value) => {
            if (canWrite(field)) {
                current[field] = show(value);
                putEffect({ kind: field, value: current[field] });
            }
        },
    };
}

function writeBody(value) {
    const type = current.body.type;

    if (!canWrite('body')) {
        return;
    }

    if (!listHas(BODY_TYPES, type)) {
        noticeLine('body-not-writable', { type });

        return;
    }

    current.body = { type: type === 'none' ? 'text' : type, text: show(value) };
    putEffect({ kind: 'body', type: current.body.type, value: current.body.text });
}

const requestApi = {};

I.define(requestApi, 'url', textField('url'));
I.define(requestApi, 'method', textField('method'));
I.define(requestApi, 'headers', {
    enumerable: true,
    value: newLines(REQUEST.headers, { field: 'headers', kind: 'header', ignoreCase: true }),
});
I.define(requestApi, 'query', {
    enumerable: true,
    value: newLines(REQUEST.query, { field: 'query', kind: 'query', ignoreCase: false }),
});
I.define(requestApi, 'body', {
    enumerable: true,
    get: () => (listHas(BODY_TYPES, current.body.type) ? current.body.text : undefined),
    set: writeBody,
});
`;
