import { parseJson } from '../engine/parse-thrown.js';

/** Where a variable a script may read comes from. */
export type ScriptVariableOrigin = 'collection' | 'environment' | 'script';

/** A variable a script may read, with the value it shows: a secret's, masked already. */
export type ScriptVariable = {
    name: string;
    origin: ScriptVariableOrigin;
    secret: boolean;
    value: string;
};

/**
 * What the editor of a script knows of the place it runs: the variables it may read, the headers
 * of its request, and a sample of the JSON its moment reads, if there is one.
 */
export type ScriptContext = {
    headers: readonly string[];
    /** A value as JSON gives it: the saved example, the last response, the last frame. */
    sample: unknown;
    variables: readonly ScriptVariable[];
};

export const EMPTY_SCRIPT_CONTEXT: ScriptContext = {
    headers: [],
    sample: undefined,
    variables: [],
};

/** A line of a headers table, as much of it as tells whether it is sent and by what name. */
type HeaderLine = { enabled: boolean; key: string };

/**
 * The names of the headers a place sends, once each: the ones switched on and named. A script
 * reads them by these names, so they are what its editor offers inside `request.headers`.
 */
export function sentHeaderNames(lines: readonly HeaderLine[]): string[] {
    return [
        ...new Set(lines.filter(({ enabled, key }) => enabled && key !== '').map(({ key }) => key)),
    ];
}

/**
 * The bounds of what the editor reads of a sample. A sample is there for the names a script
 * reaches by writing them, and the service of scripts reads its type again on every change of
 * the text: a deeper level, a wider object or more fields in all would cost every keystroke and
 * the memory of the service for names nobody writes by hand. Past a bound, a value is `any`.
 */
export const SAMPLE_DEPTH = 6;

export const SAMPLE_WIDTH = 50;

export const SAMPLE_FIELDS = 1000;

/** The longest text read for a sample: past it, reading it costs more than the names it gives. */
export const SAMPLE_TEXT_LIMIT = 1_000_000;

/** The sample of a text, when it is JSON short enough to read. */
export function sampleOf(text: string | undefined): unknown {
    if (text === undefined || text.length > SAMPLE_TEXT_LIMIT) {
        return undefined;
    }

    return parseJson(text);
}

/** What is left to read of a sample: each field spends one. */
type Budget = { left: number };

const PRIMITIVE_TYPES: Partial<Record<string, string>> = {
    boolean: 'boolean',
    number: 'number',
    string: 'string',
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

/** Every level stays open: a field the sample lacks is no error, the next response may bring it. */
const OPEN_KEYS = '[key: string]: any;';

/** A key as TypeScript reads it: bare when it is a name, quoted when it is not. */
function keyOf(key: string): string {
    return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The fields of an object the editor reads, in order and within its width. */
function fieldsOf(value: Record<string, unknown>): [string, unknown][] {
    return Object.entries(value).slice(0, SAMPLE_WIDTH);
}

function objectTypeOf(value: Record<string, unknown>, depth: number, budget: Budget): string {
    const members: string[] = [];

    for (const [key, field] of fieldsOf(value)) {
        if (budget.left <= 0) {
            break;
        }

        budget.left -= 1;
        members.push(`${keyOf(key)}: ${typeAt(field, depth + 1, budget)};`);
    }

    return `{ ${[...members, OPEN_KEYS].join(' ')} }`;
}

function typeAt(value: unknown, depth: number, budget: Budget): string {
    if (depth >= SAMPLE_DEPTH || budget.left <= 0) {
        return 'any';
    }

    if (Array.isArray(value)) {
        return `${value.length === 0 ? 'any' : typeAt(value[0], depth + 1, budget)}[]`;
    }

    if (isObject(value)) {
        return objectTypeOf(value, depth, budget);
    }

    return PRIMITIVE_TYPES[typeof value] ?? 'any';
}

/** The TypeScript type of a sample: a list by its first item, and `any` past the bounds. */
export function sampleTypeOf(sample: unknown): string {
    return typeAt(sample, 0, { left: SAMPLE_FIELDS });
}

type Field = { at: string; key: string; value: unknown };

function childrenOf({ at, value }: Pick<Field, 'at' | 'value'>): Field[] {
    if (!isObject(value)) {
        return [];
    }

    return fieldsOf(value).map(([key, field]) => ({
        at: `${at}${IDENTIFIER.test(key) ? `.${key}` : `[${keyOf(key)}]`}`,
        key,
        value: field,
    }));
}

/**
 * The path a script writes after the read of a sample to reach each name in it (`.data.token`),
 * the shallowest first, level by level. A list is not walked: its items are many, and none is
 * the one.
 */
export function sampleFieldPaths(sample: unknown): ReadonlyMap<string, string> {
    const paths = new Map<string, string>();
    let level: Pick<Field, 'at' | 'value'>[] = [{ at: '', value: sample }];
    let walked = 0;

    for (let depth = 0; depth < SAMPLE_DEPTH && walked < SAMPLE_FIELDS; depth += 1) {
        const fields = level.flatMap(childrenOf).slice(0, SAMPLE_FIELDS - walked);

        fields.forEach(({ at, key }) => {
            paths.set(key, paths.get(key) ?? at);
        });
        walked += fields.length;
        level = fields;
    }

    return paths;
}
