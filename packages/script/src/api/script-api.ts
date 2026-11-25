import type { ScriptRunInput } from '../contract/script-run.js';

export type ScriptEvent = ScriptRunInput['event'];

/** A name of JavaScript a script has in scope beside `mandor`. */
export type StandardName = 'console' | 'atob' | 'btoa' | 'URLSearchParams';

/** A name the script has in scope when it starts: the four of JavaScript and `mandor`. */
export type ScriptApiObject = StandardName | 'mandor';

/** What `mandor` may hold. Each event shows some of it. */
export type MandorMember =
    'variables' | 'test' | 'expect' | 'request' | 'response' | 'message' | 'socket' | 'sendRequest';

/** The names of JavaScript every script has, in the order the guest hands them over. */
export const STANDARD_NAMES: readonly StandardName[] = [
    'console',
    'atob',
    'btoa',
    'URLSearchParams',
];

/** What of the request a script may write. What it may not, it reads. */
export type RequestField = 'url' | 'method' | 'query' | 'headers' | 'body';

export type EventApi = {
    /** What `mandor` holds in the event, in the order the guest builds it. */
    members: readonly MandorMember[];
    /** The parts of `request` that a write leaves an effect for, in this event. */
    requestWrites: readonly RequestField[];
};

const EVERY_EVENT: readonly MandorMember[] = ['variables', 'test', 'expect'];

/** What each event shows to a script: the one place that says so. The guest and the editor read it. */
export const API_BY_EVENT: Record<ScriptEvent, EventApi> = {
    onBeforeRequest: {
        members: [...EVERY_EVENT, 'request', 'sendRequest'],
        requestWrites: ['url', 'method', 'query', 'headers', 'body'],
    },
    onResponse: {
        members: [...EVERY_EVENT, 'request', 'response', 'sendRequest'],
        requestWrites: [],
    },
    onBeforeConnect: {
        members: [...EVERY_EVENT, 'request', 'sendRequest'],
        requestWrites: ['url', 'query', 'headers'],
    },
    onConnect: { members: [...EVERY_EVENT, 'socket', 'sendRequest'], requestWrites: [] },
    onMessage: { members: [...EVERY_EVENT, 'message', 'socket'], requestWrites: [] },
};

/** One parameter of a function of the API, with the key of the text that explains it. */
export type ApiParameter = { name: string; docKey: string };

/** A name of the API with its shape, for the types of the editor and the page of docs. */
export type ApiEntry = {
    /**
     * The path the script writes: from `mandor` for what lives there (`request.headers.set`), from
     * the scope for a name of JavaScript (`console.log`).
     */
    name: string;
    /** What it hangs from: a name of JavaScript, or the member of `mandor`. */
    owner: StandardName | MandorMember;
    /** A TypeScript type: a call signature for a function, a type for a value. */
    signature: string;
    /** The key of the text that explains it. */
    docKey: string;
    /** The parameters of a function, in the order of its signature; none for a value. */
    parameters: readonly ApiParameter[];
};

function entry(
    owner: ApiEntry['owner'],
    name: string,
    signature: string,
    parameters: readonly string[] = [],
): ApiEntry {
    return {
        name,
        owner,
        signature,
        docKey: `script.api.${name}`,
        parameters: parameters.map((parameter) => ({
            name: parameter,
            docKey: `script.param.${name}.${parameter}`,
        })),
    };
}

/** Whether a name is one of JavaScript, outside `mandor`. */
export function isStandardName(owner: ApiEntry['owner']): owner is StandardName {
    return (STANDARD_NAMES as readonly string[]).includes(owner);
}

/** The path as a script writes it: `mandor.request.headers.set`, `console.log`. */
export function scriptPathOf(entry: ApiEntry): string {
    return isStandardName(entry.owner) ? entry.name : `mandor.${entry.name}`;
}

const TEXT_OR_NOTHING = 'string | undefined';

function readLines(owner: 'request' | 'response', part: string): ApiEntry[] {
    const at = `${owner}.${part}`;

    return [
        entry(owner, `${at}.get`, `(name: string): ${TEXT_OR_NOTHING}`, ['name']),
        entry(owner, `${at}.has`, '(name: string): boolean', ['name']),
    ];
}

function editLines(part: string): ApiEntry[] {
    const at = `request.${part}`;

    return [
        ...readLines('request', part),
        entry('request', `${at}.set`, '(name: string, value: unknown): void', ['name', 'value']),
        entry('request', `${at}.delete`, '(name: string): void', ['name']),
    ];
}

const SEND_OPTIONS =
    '{ url: string; method?: string; headers?: Record<string, unknown> | { name: string; value: unknown }[]; body?: unknown }';

/** Every name the guest defines, each under what owns it. */
export const SCRIPT_API: readonly ApiEntry[] = [
    ...(['log', 'info', 'warn', 'error'] as const).map((level) =>
        entry('console', `console.${level}`, '(...values: unknown[]): void', ['values']),
    ),
    entry('atob', 'atob', '(data: string): string', ['data']),
    entry('btoa', 'btoa', '(data: string): string', ['data']),
    entry(
        'URLSearchParams',
        'URLSearchParams',
        'new (init?: string | Record<string, unknown> | [string, unknown][]): URLSearchParams',
        ['init'],
    ),
    entry('variables', 'variables.get', `(name: MandorVariableName): ${TEXT_OR_NOTHING}`, ['name']),
    entry('variables', 'variables.set', '(name: MandorVariableName, value: unknown): void', [
        'name',
        'value',
    ]),
    entry('variables', 'variables.has', '(name: MandorVariableName): boolean', ['name']),
    entry('variables', 'variables.replaceIn', '(text: string): string', ['text']),
    entry('test', 'test', '(name: string, body: () => unknown): Promise<void>', ['name', 'body']),
    entry('expect', 'expect', '(actual: unknown): Assertion', ['actual']),
    entry('request', 'request.url', 'string'),
    entry('request', 'request.method', 'string'),
    entry('request', 'request.body', TEXT_OR_NOTHING),
    ...editLines('headers'),
    ...editLines('query'),
    entry('response', 'response.status', 'number'),
    entry('response', 'response.time', 'number'),
    entry('response', 'response.text', `(): ${TEXT_OR_NOTHING}`),
    entry('response', 'response.json', '(): any'),
    ...readLines('response', 'headers'),
    entry('response', 'response.to', 'ResponseAssertion'),
    entry('message', 'message.text', TEXT_OR_NOTHING),
    entry('message', 'message.direction', "'incoming' | 'outgoing'"),
    entry('message', 'message.binary', 'boolean'),
    entry('message', 'message.event', TEXT_OR_NOTHING),
    entry('message', 'message.json', '(): MandorSample'),
    entry('socket', 'socket.send', '(text: string): void', ['text']),
    entry('sendRequest', 'sendRequest', `(options: ${SEND_OPTIONS}): Promise<MandorResponse>`, [
        'options',
    ]),
];
