import { beforeAll, describe, expect, it } from 'vitest';

import { API_BY_EVENT, SCRIPT_API, type ScriptApiObject } from '../../src/api/script-api.js';
import { scriptEventSchema } from '../../src/contract/script-run.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';
import { outputAt } from '../engine/guest/support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

const OBJECTS: ScriptApiObject[] = [
    'sendRequest',
    'console',
    'atob',
    'btoa',
    'URLSearchParams',
    'vars',
    'test',
    'expect',
    'request',
    'response',
    'message',
    'socket',
];

// Walks every name the script has in scope and logs the paths of what it finds: a function or a
// value is a leaf, an object is walked by its own enumerable keys.
const WALK = `
const roots = {};
${OBJECTS.map((name) => `if (typeof ${name} !== 'undefined') { roots.${name} = ${name}; }`).join('\n')}
const found = [];
function walk(path, value) {
    if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach((key) => walk(path + '.' + key, value[key]));
    } else {
        found.push(path);
    }
}
Object.keys(roots).forEach((name) => walk(name, roots[name]));
console.log(JSON.stringify(found.map((path) => path.replace(/^(\\w+)\\.\\1$/, '$1'))));
`;

async function foundIn(event: keyof typeof API_BY_EVENT): Promise<string[]> {
    const [line] = (await outputAt(wasm, event, WALK)).logs;

    return JSON.parse(line !== undefined && 'text' in line ? line.text : '[]') as string[];
}

function namesOf(event: keyof typeof API_BY_EVENT): string[] {
    const { objects } = API_BY_EVENT[event];

    return SCRIPT_API.filter((entry) => objects.includes(entry.object)).map(({ name }) => name);
}

describe('API_BY_EVENT', () => {
    it('has a row for every event of a script, and no other', () => {
        expect(Object.keys(API_BY_EVENT).sort()).toEqual([...scriptEventSchema.options].sort());
    });

    it.each([
        ['onBeforeRequest', ['url', 'method', 'query', 'headers', 'body']],
        ['onResponse', []],
        ['onBeforeConnect', ['url', 'query', 'headers']],
        ['onConnect', []],
        ['onMessage', []],
    ] as const)('says what %s may write of the request', (event, writes) => {
        expect(API_BY_EVENT[event].requestWrites).toEqual(writes);
    });

    it('shows request to the events of a request and of a connection that opens', () => {
        expect(API_BY_EVENT.onBeforeRequest.objects).toContain('request');
        expect(API_BY_EVENT.onResponse.objects).toEqual(
            expect.arrayContaining(['request', 'response']),
        );
        expect(API_BY_EVENT.onBeforeConnect.objects).toContain('request');
        expect(API_BY_EVENT.onConnect.objects).toContain('socket');
        expect(API_BY_EVENT.onMessage.objects).toEqual(
            expect.arrayContaining(['message', 'socket']),
        );
    });
});

describe('SCRIPT_API', () => {
    it('names every member once, under an object some event shows', () => {
        const names = SCRIPT_API.map(({ name }) => name);
        const shown = Object.values(API_BY_EVENT).flatMap(({ objects }) => objects);

        expect(new Set(names).size).toBe(names.length);
        expect(SCRIPT_API.every(({ object }) => shown.includes(object))).toBe(true);
    });

    it('gives each member a signature and the key of its explanation', () => {
        expect(SCRIPT_API.every(({ signature }) => signature.length > 0)).toBe(true);
        expect(SCRIPT_API.map(({ docKey }) => docKey)).toEqual(
            SCRIPT_API.map(({ name }) => `script.api.${name}`),
        );
    });

    it.each(scriptEventSchema.options)(
        'matches what the guest defines for %s, name by name',
        async (event) => {
            expect((await foundIn(event)).sort()).toEqual(namesOf(event).sort());
        },
    );
});
