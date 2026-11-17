/**
 * `btoa` and `atob`, which the engine does not bring. `btoa` refuses a character outside Latin-1
 * and `atob` a text that is no base64, the way the web does, with an error named
 * `InvalidCharacterError`. Needs `I`.
 */
export const BASE64_GUEST = String.raw`
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function fail(name, message) {
    const error = new I.Error(message);

    error.name = name;

    return error;
}

function latin1At(text, index) {
    if (index >= text.length) {
        return -1;
    }

    const code = I.charCodeAt(text, index);

    if (code > 255) {
        throw fail('InvalidCharacterError', 'The string to be encoded contains characters outside of the Latin1 range.');
    }

    return code;
}

function byteOr0(code) {
    return code < 0 ? 0 : code;
}

function btoa(input) {
    const text = I.toText(input);
    let out = '';

    for (let index = 0; index < text.length; index += 3) {
        const first = latin1At(text, index);
        const second = latin1At(text, index + 1);
        const third = latin1At(text, index + 2);
        const bits = (first << 16) | (byteOr0(second) << 8) | byteOr0(third);

        out += I.charAt(BASE64, (bits >> 18) & 63) + I.charAt(BASE64, (bits >> 12) & 63);
        out += second < 0 ? '=' : I.charAt(BASE64, (bits >> 6) & 63);
        out += third < 0 ? '=' : I.charAt(BASE64, bits & 63);
    }

    return out;
}

function withoutSpaces(raw) {
    let text = '';

    for (let index = 0; index < raw.length; index += 1) {
        const code = I.charCodeAt(raw, index);

        if (code !== 32 && code !== 9 && code !== 10 && code !== 12 && code !== 13) {
            text += I.charAt(raw, index);
        }
    }

    return text;
}

function withoutPadding(text) {
    if (text.length % 4 !== 0) {
        return text;
    }

    if (I.slice(text, -2) === '==') {
        return I.slice(text, 0, -2);
    }

    return I.slice(text, -1) === '=' ? I.slice(text, 0, -1) : text;
}

function notBase64() {
    return fail('InvalidCharacterError', 'The string to be decoded is not correctly encoded.');
}

function atob(input) {
    const text = withoutPadding(withoutSpaces(I.toText(input)));
    let out = '';
    let bits = 0;
    let count = 0;

    for (let index = 0; index < text.length; index += 1) {
        const value = I.indexOf(BASE64, I.charAt(text, index));

        if (value < 0) {
            throw notBase64();
        }

        bits = (bits << 6) | value;
        count += 6;

        if (count >= 8) {
            count -= 8;
            out += I.fromCharCode((bits >> count) & 255);
            bits &= (1 << count) - 1;
        }
    }

    if (text.length % 4 === 1) {
        throw notBase64();
    }

    return out;
}
`;
