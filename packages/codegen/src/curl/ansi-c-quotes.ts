type Mode = 'outside' | 'single' | 'double';
type Step = { text: string; next: number; mode: Mode };
type Escape = { value: string; length: number };
type StepAt = (text: string, index: number, mode: Mode) => Step | null;

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
    a: '\x07',
    b: '\b',
    e: '\x1b',
    E: '\x1b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
    '\\': '\\',
    "'": "'",
    '"': '"',
    '?': '?',
};

// The escapes that carry a number: the pattern after the backslash, the letter it starts with
// (not part of the number) and the base.
const NUMERIC_ESCAPES: readonly { lead: RegExp; letter: number; radix: number }[] = [
    { lead: /^x[0-9a-fA-F]{1,2}/, letter: 1, radix: 16 },
    { lead: /^u[0-9a-fA-F]{1,4}/, letter: 1, radix: 16 },
    { lead: /^U[0-9a-fA-F]{1,8}/, letter: 1, radix: 16 },
    { lead: /^[0-7]{1,3}/, letter: 0, radix: 8 },
];

const LAST_CODE_POINT = 0x10ffff;

function numericEscape(rest: string): Escape | null {
    for (const { lead, letter, radix } of NUMERIC_ESCAPES) {
        const match = lead.exec(rest);
        const code = match ? Number.parseInt(match[0].slice(letter), radix) : NaN;

        if (match && code <= LAST_CODE_POINT) {
            const value =
                radix === 8 ? String.fromCharCode(code & 0xff) : String.fromCodePoint(code);

            return { value, length: match[0].length };
        }
    }

    return null;
}

/** What follows a backslash: a known escape, a number, or the backslash and the letter as they are. */
function escapeOf(rest: string): Escape {
    const simple = SIMPLE_ESCAPES[rest.charAt(0)];

    if (simple !== undefined) {
        return { value: simple, length: 1 };
    }

    return numericEscape(rest) ?? { value: `\\${rest.charAt(0)}`, length: 1 };
}

/** One letter of a `$'…'` body: what a backslash and its escape mean, or the letter itself. */
function letterAt(text: string, index: number): Escape {
    if (text.charAt(index) !== '\\') {
        return { value: text.charAt(index), length: 1 };
    }

    const escape = escapeOf(text.slice(index + 1));

    return { value: escape.value, length: 1 + escape.length };
}

/** Reads the body of a `$'…'` string from just after its opening, or null when it never closes. */
function readAnsiC(text: string, start: number): { decoded: string; end: number } | null {
    let decoded = '';
    let index = start;

    while (index < text.length) {
        if (text.charAt(index) === "'") {
            return { decoded, end: index + 1 };
        }

        const letter = letterAt(text, index);

        decoded += letter.value;
        index += letter.length;
    }

    return null;
}

function quoteSingle(text: string): string {
    return `'${text.replaceAll("'", "'\\''")}'`;
}

/** The quote that opens or closes each mode; any other letter leaves the mode as it was. */
const MODE_AFTER: Readonly<Record<Mode, ReadonlyMap<string, Mode>>> = {
    outside: new Map([
        ["'", 'single'],
        ['"', 'double'],
    ]),
    single: new Map([["'", 'outside']]),
    double: new Map([['"', 'outside']]),
};

/** A backslash keeps the letter after it as it is, quote or not. */
function escapedStep(text: string, index: number, mode: Mode): Step | null {
    if (!text.startsWith('\\', index)) {
        return null;
    }

    return { text: text.slice(index, index + 2), next: index + 2, mode };
}

/** A `$'…'` that closes, rewritten between plain single quotes. */
function ansiCStep(text: string, index: number, mode: Mode): Step | null {
    const ansi = text.startsWith("$'", index) ? readAnsiC(text, index + 2) : null;

    if (ansi === null) {
        return null;
    }

    return { text: quoteSingle(ansi.decoded), next: ansi.end, mode };
}

/** What a letter can start in each mode, tried in order: inside single quotes, nothing does. */
const STEPS_OF_MODE: Readonly<Record<Mode, readonly StepAt[]>> = {
    outside: [escapedStep, ansiCStep],
    double: [escapedStep],
    single: [],
};

function stepOf(text: string, index: number, mode: Mode): Step {
    const char = text.charAt(index);

    for (const stepAt of STEPS_OF_MODE[mode]) {
        const step = stepAt(text, index, mode);

        if (step !== null) {
            return step;
        }
    }

    return { text: char, next: index + 1, mode: MODE_AFTER[mode].get(char) ?? mode };
}

/**
 * Rewrites every `$'…'` of bash, which `shell-quote` reads as a `$` and a quote, into the same
 * text between plain single quotes. Only outside other quotes: inside them `$'` is two letters.
 * Chrome writes its «Copy as cURL (bash)» this way. A string that never closes stays as it was.
 */
export function expandAnsiCQuotes(text: string): string {
    let expanded = '';
    let mode: Mode = 'outside';
    let index = 0;

    while (index < text.length) {
        const step = stepOf(text, index, mode);

        expanded += step.text;
        index = step.next;
        mode = step.mode;
    }

    return expanded;
}
