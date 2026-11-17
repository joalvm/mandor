import type { ScriptRunInput } from '../contract/script-run.js';

export type ScriptEvent = ScriptRunInput['event'];

/** A name the script has in scope when it starts: an object, a function or a class. */
export type ScriptApiObject =
    | 'console'
    | 'atob'
    | 'btoa'
    | 'URLSearchParams'
    | 'vars'
    | 'test'
    | 'expect'
    | 'request'
    | 'response'
    | 'message'
    | 'socket'
    | 'sendRequest';

/** What of the request a script may write. What it may not, it reads. */
export type RequestField = 'url' | 'method' | 'query' | 'headers' | 'body';

export type EventApi = {
    /** What the event shows to the script, in the order of its parameters. */
    objects: readonly ScriptApiObject[];
    /** The parts of `request` that a write leaves an effect for, in this event. */
    requestWrites: readonly RequestField[];
};

const EVERY_EVENT: readonly ScriptApiObject[] = [
    'console',
    'atob',
    'btoa',
    'URLSearchParams',
    'vars',
    'test',
    'expect',
];

/** What each event shows to a script: the one place that says so. The guest and the editor read it. */
export const API_BY_EVENT: Record<ScriptEvent, EventApi> = {
    onBeforeRequest: {
        objects: [...EVERY_EVENT, 'request', 'sendRequest'],
        requestWrites: ['url', 'method', 'query', 'headers', 'body'],
    },
    onResponse: {
        objects: [...EVERY_EVENT, 'request', 'response', 'sendRequest'],
        requestWrites: [],
    },
    onBeforeConnect: {
        objects: [...EVERY_EVENT, 'request', 'sendRequest'],
        requestWrites: ['url', 'query', 'headers'],
    },
    onConnect: { objects: [...EVERY_EVENT, 'socket', 'sendRequest'], requestWrites: [] },
    onMessage: { objects: [...EVERY_EVENT, 'message', 'socket'], requestWrites: [] },
};

/** A name of the API with its shape, for the completion of the editor and the page of docs. */
export type ApiEntry = {
    /** The path the script writes: `request.headers.set`. */
    name: string;
    object: ScriptApiObject;
    signature: string;
    /** The key of the text that explains it. */
    docKey: string;
};

function entry(object: ScriptApiObject, name: string, signature: string): ApiEntry {
    return { name, object, signature, docKey: `script.api.${name}` };
}

const TEXT_OR_NOTHING = 'string | undefined';

function readLines(object: 'request' | 'response', part: string): ApiEntry[] {
    const at = `${object}.${part}`;

    return [
        entry(object, `${at}.get`, `(name: string): ${TEXT_OR_NOTHING}`),
        entry(object, `${at}.has`, '(name: string): boolean'),
    ];
}

function editLines(part: string): ApiEntry[] {
    const at = `request.${part}`;

    return [
        ...readLines('request', part),
        entry('request', `${at}.set`, '(name: string, value: unknown): void'),
        entry('request', `${at}.delete`, '(name: string): void'),
    ];
}

/** Every name the guest defines, each under the object that owns it. */
export const SCRIPT_API: readonly ApiEntry[] = [
    ...(['log', 'info', 'warn', 'error'] as const).map((level) =>
        entry('console', `console.${level}`, '(...values: unknown[]): void'),
    ),
    entry('atob', 'atob', '(data: string): string'),
    entry('btoa', 'btoa', '(data: string): string'),
    entry('URLSearchParams', 'URLSearchParams', 'new (init?: string | object): URLSearchParams'),
    entry('vars', 'vars.get', `(name: string): ${TEXT_OR_NOTHING}`),
    entry('vars', 'vars.set', '(name: string, value: unknown): void'),
    entry('vars', 'vars.has', '(name: string): boolean'),
    entry('vars', 'vars.replaceIn', '(text: string): string'),
    entry('test', 'test', '(name: string, body: () => unknown): Promise<void>'),
    entry('expect', 'expect', '(actual: unknown): Assertion'),
    entry('request', 'request.url', 'string'),
    entry('request', 'request.method', 'string'),
    entry('request', 'request.body', TEXT_OR_NOTHING),
    ...editLines('headers'),
    ...editLines('query'),
    entry('response', 'response.status', 'number'),
    entry('response', 'response.timeMs', 'number'),
    entry('response', 'response.text', `(): ${TEXT_OR_NOTHING}`),
    entry('response', 'response.json', '(): unknown'),
    ...readLines('response', 'headers'),
    entry('message', 'message.text', TEXT_OR_NOTHING),
    entry('message', 'message.direction', "'incoming' | 'outgoing'"),
    entry('message', 'message.binary', 'boolean'),
    entry('message', 'message.event', TEXT_OR_NOTHING),
    entry('socket', 'socket.send', '(text: string): void'),
    entry(
        'sendRequest',
        'sendRequest',
        '(options: { url: string; method?: string; headers?: object; body?: unknown }): Promise<Response>',
    ),
];
