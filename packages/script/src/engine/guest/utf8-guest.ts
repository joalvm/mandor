/**
 * UTF-8 as the web does it: text to bytes, with a lone surrogate as the replacement character,
 * and bytes to text, where each invalid stretch becomes one replacement character the way the
 * decoder of the web cuts it. Needs `I`.
 */
export const UTF8_GUEST = String.raw`
// The bytes of one code point, in as many as its size asks for.
function pushCode(bytes, code) {
    if (code < 0x80) {
        I.push(bytes, code);

        return;
    }

    if (code < 0x800) {
        I.push(bytes, 0xc0 | (code >> 6), 0x80 | (code & 63));

        return;
    }

    if (code < 0x10000) {
        I.push(bytes, 0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));

        return;
    }

    I.push(bytes, 0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
}

// The bytes of the character at index, a lone surrogate as the replacement; gives its width in units.
function pushCharAt(bytes, text, index) {
    const code = I.codePointAt(text, index);

    pushCode(bytes, code >= 0xd800 && code <= 0xdfff ? 0xfffd : code);

    return code > 0xffff ? 2 : 1;
}

function utf8Bytes(text) {
    const bytes = [];
    let index = 0;

    while (index < text.length) {
        index += pushCharAt(bytes, text, index);
    }

    return bytes;
}

function threeByteLead(byte) {
    return { need: 2, code: byte & 0x0f, low: byte === 0xe0 ? 0xa0 : 0x80, high: byte === 0xed ? 0x9f : 0xbf };
}

function fourByteLead(byte) {
    return { need: 3, code: byte & 0x07, low: byte === 0xf0 ? 0x90 : 0x80, high: byte === 0xf4 ? 0x8f : 0xbf };
}

function leadOf(byte) {
    if (byte >= 0xc2 && byte <= 0xdf) {
        return { need: 1, code: byte & 0x1f, low: 0x80, high: 0xbf };
    }

    if (byte >= 0xe0 && byte <= 0xef) {
        return threeByteLead(byte);
    }

    if (byte >= 0xf0 && byte <= 0xf4) {
        return fourByteLead(byte);
    }

    return undefined;
}

function decodeOne(bytes, start) {
    const lead = leadOf(bytes[start]);

    if (lead === undefined) {
        return { text: '�', used: 1 };
    }

    let code = lead.code;

    for (let step = 1; step <= lead.need; step += 1) {
        const byte = bytes[start + step];
        const low = step === 1 ? lead.low : 0x80;
        const high = step === 1 ? lead.high : 0xbf;

        if (byte === undefined || byte < low || byte > high) {
            return { text: '�', used: step };
        }

        code = (code << 6) | (byte & 63);
    }

    return { text: I.fromCodePoint(code), used: lead.need + 1 };
}

function utf8Text(bytes) {
    let out = '';

    for (let index = 0; index < bytes.length; ) {
        if (bytes[index] < 0x80) {
            out += I.fromCharCode(bytes[index]);
            index += 1;
        } else {
            const one = decodeOne(bytes, index);

            out += one.text;
            index += one.used;
        }
    }

    return out;
}
`;
