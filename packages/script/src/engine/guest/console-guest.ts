/**
 * `console` of the script, and `show`, the one way the guest turns a value into a line of text:
 * vars use it too. A value that cannot be shown does not break the run: it shows as what it is.
 * A line longer than `LINE_UNITS` UTF-16 units is cut here, only so a huge line costs no memory:
 * a unit is at least one byte of UTF-8, so a line that fits the limit in bytes is never cut, and
 * main makes the real cut, in bytes. Needs `I`, `OUT`, `LINE_UNITS` and `CUT_MARK`.
 */
export const CONSOLE_GUEST = String.raw`
function safeJson(value) {
    const ancestors = [];

    return I.stringify(value, function (key, item) {
        if (typeof item !== 'object' || item === null) {
            return item;
        }

        while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
            I.pop(ancestors);
        }

        for (let index = 0; index < ancestors.length; index += 1) {
            if (ancestors[index] === item) {
                return '[Circular]';
            }
        }

        I.push(ancestors, item);

        return item;
    });
}

function textOf(value) {
    if (typeof value === 'object' && value !== null) {
        if (typeof value.stack === 'string' && typeof value.message === 'string') {
            return I.toText(value.name) + ': ' + value.message;
        }

        const json = safeJson(value);

        if (json !== undefined) {
            return json;
        }
    }

    return I.toText(value);
}

function show(value) {
    if (typeof value === 'string') {
        return value;
    }

    try {
        return textOf(value);
    } catch {
        try {
            return I.toText(value);
        } catch {
            return '[unprintable]';
        }
    }
}

function cut(text) {
    return text.length > LINE_UNITS ? I.slice(text, 0, LINE_UNITS) + CUT_MARK : text;
}

function write(level, args) {
    const parts = [];

    for (let index = 0; index < args.length; index += 1) {
        I.push(parts, show(args[index]));
    }

    I.push(OUT.logs, { level, text: cut(I.join(parts, ' ')) });
}

const consoleApi = {
    log(...args) { write('log', args); },
    info(...args) { write('info', args); },
    warn(...args) { write('warn', args); },
    error(...args) { write('error', args); },
};
`;
