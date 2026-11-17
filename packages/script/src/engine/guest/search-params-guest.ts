/**
 * `URLSearchParams`, a subset: built from a string, an object, pairs or another one, with `get`,
 * `getAll`, `set`, `append`, `delete`, `has`, `toString` and iteration, in the form encoding of the
 * web (UTF-8, a plus for a space). Needs `I` and the functions of `UTF8_GUEST`.
 */
export const SEARCH_PARAMS_GUEST = String.raw`
const HEX = '0123456789ABCDEF';
function isUnreserved(byte) {
    return (byte >= 48 && byte <= 57) || (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122)
        || byte === 42 || byte === 45 || byte === 46 || byte === 95;
}

function encodedByte(byte) {
    if (byte === 32) {
        return '+';
    }

    if (isUnreserved(byte)) {
        return I.fromCharCode(byte);
    }

    return '%' + I.charAt(HEX, byte >> 4) + I.charAt(HEX, byte & 15);
}

function encodeForm(text) {
    const bytes = utf8Bytes(text);
    let out = '';

    for (let index = 0; index < bytes.length; index += 1) {
        out += encodedByte(bytes[index]);
    }

    return out;
}

// The value of the hex digit at index, either case, or -1; past the end is no digit.
function hexAt(text, index) {
    const at = index < text.length ? I.indexOf('0123456789abcdefABCDEF', I.charAt(text, index)) : -1;

    return at < 16 ? at : at - 6;
}

// Reads the piece of a form text at index into bytes: an escape, a plus, or a character as UTF-8.
// Gives how many units of the text it read.
function readForm(text, index, bytes) {
    const high = I.charAt(text, index) === '%' ? hexAt(text, index + 1) : -1;
    const low = high >= 0 ? hexAt(text, index + 2) : -1;

    if (low >= 0) {
        I.push(bytes, high * 16 + low);

        return 3;
    }

    if (I.charAt(text, index) === '+') {
        I.push(bytes, 32);

        return 1;
    }

    return pushCharAt(bytes, text, index);
}

function bytesOfForm(text) {
    const bytes = [];
    let index = 0;

    while (index < text.length) {
        index += readForm(text, index, bytes);
    }

    return bytes;
}

function decodeForm(text) {
    return utf8Text(bytesOfForm(text));
}

function parseQuery(raw) {
    const text = I.slice(raw, 0, 1) === '?' ? I.slice(raw, 1) : raw;
    const pairs = [];
    let from = 0;

    while (from <= text.length) {
        const found = I.indexOf(text, '&', from);
        const end = found < 0 ? text.length : found;
        const segment = I.slice(text, from, end);
        const equals = I.indexOf(segment, '=');

        if (segment !== '') {
            I.push(pairs, equals < 0
                ? [decodeForm(segment), '']
                : [decodeForm(I.slice(segment, 0, equals)), decodeForm(I.slice(segment, equals + 1))]);
        }

        from = end + 1;
    }

    return pairs;
}

function pairsOfIterable(init) {
    const pairs = [];
    const iterator = init[I.iterator]();

    for (let step = iterator.next(); !step.done; step = iterator.next()) {
        if (!I.isArray(step.value) || step.value.length !== 2) {
            throw new I.TypeError('Each pair must have exactly two items.');
        }

        I.push(pairs, [I.toText(step.value[0]), I.toText(step.value[1])]);
    }

    return pairs;
}

function pairsOfRecord(init) {
    const names = I.keys(init);
    const pairs = [];

    for (let index = 0; index < names.length; index += 1) {
        I.push(pairs, [names[index], I.toText(init[names[index]])]);
    }

    return pairs;
}

function pairsOf(init) {
    if (init === undefined) {
        return [];
    }

    if (typeof init !== 'object' || init === null) {
        return parseQuery(I.toText(init));
    }

    if (typeof init[I.iterator] === 'function') {
        return pairsOfIterable(init);
    }

    return pairsOfRecord(init);
}

class URLSearchParams {
    #list;

    constructor(init) {
        this.#list = pairsOf(init);
    }

    append(name, value) {
        I.push(this.#list, [I.toText(name), I.toText(value)]);
    }

    delete(name, value) {
        const key = I.toText(name);
        const kept = [];

        for (let index = 0; index < this.#list.length; index += 1) {
            const pair = this.#list[index];
            const same = pair[0] === key && (value === undefined || pair[1] === I.toText(value));

            if (!same) {
                I.push(kept, pair);
            }
        }

        this.#list = kept;
    }

    get(name) {
        const key = I.toText(name);

        for (let index = 0; index < this.#list.length; index += 1) {
            if (this.#list[index][0] === key) {
                return this.#list[index][1];
            }
        }

        return null;
    }

    getAll(name) {
        const key = I.toText(name);
        const values = [];

        for (let index = 0; index < this.#list.length; index += 1) {
            if (this.#list[index][0] === key) {
                I.push(values, this.#list[index][1]);
            }
        }

        return values;
    }

    has(name, value) {
        const key = I.toText(name);

        for (let index = 0; index < this.#list.length; index += 1) {
            const pair = this.#list[index];

            if (pair[0] === key && (value === undefined || pair[1] === I.toText(value))) {
                return true;
            }
        }

        return false;
    }

    set(name, value) {
        const key = I.toText(name);
        const text = I.toText(value);
        const kept = [];
        let placed = false;

        for (let index = 0; index < this.#list.length; index += 1) {
            const pair = this.#list[index];
            const ours = pair[0] === key;

            // The first pair of the name takes the new value; the others of the name are dropped.
            if (!ours || !placed) {
                I.push(kept, ours ? [key, text] : pair);
            }

            placed = placed || ours;
        }

        if (!placed) {
            I.push(kept, [key, text]);
        }

        this.#list = kept;
    }

    toString() {
        const parts = [];

        for (let index = 0; index < this.#list.length; index += 1) {
            I.push(parts, encodeForm(this.#list[index][0]) + '=' + encodeForm(this.#list[index][1]));
        }

        return I.join(parts, '&');
    }

    #walk(pick) {
        let index = 0;
        const iterator = {
            next: () => {
                if (index >= this.#list.length) { return { done: true, value: undefined }; }

                index += 1;

                return { done: false, value: pick(this.#list[index - 1]) };
            },
        };

        iterator[I.iterator] = function () { return this; };
        return iterator;
    }

    entries() { return this.#walk((pair) => [pair[0], pair[1]]); }
    keys() { return this.#walk((pair) => pair[0]); }
    values() { return this.#walk((pair) => pair[1]); }
    [I.iterator]() { return this.entries(); }
}
`;
