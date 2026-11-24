import { beforeAll, describe, expect, it } from 'vitest';

import {
    API_BY_EVENT,
    SCRIPT_API,
    isStandardName,
    scriptPathOf,
} from '../../src/api/script-api.js';
import { scriptEventSchema } from '../../src/contract/script-run.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';
import { outputAt } from '../engine/guest/support.js';

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

// Walks every name the script has in scope and logs the paths of what it finds: a function or a
// value is a leaf, an object is walked by its own enumerable keys.
const WALK = `
const roots = { console, atob, btoa, URLSearchParams, mandor };
const found = [];
function walk(path, value) {
    if (typeof value === 'object' && value !== null) {
        Object.keys(value).forEach((key) => walk(path + '.' + key, value[key]));
    } else {
        found.push(path);
    }
}
Object.keys(roots).forEach((name) => walk(name, roots[name]));
console.log(JSON.stringify(found));
`;

async function foundIn(event: keyof typeof API_BY_EVENT): Promise<string[]> {
    const [line] = (await outputAt(wasm, event, WALK)).logs;

    return JSON.parse(line !== undefined && 'text' in line ? line.text : '[]') as string[];
}

function namesOf(event: keyof typeof API_BY_EVENT): string[] {
    const members: readonly string[] = API_BY_EVENT[event].members;

    return SCRIPT_API.filter(
        (entry) => isStandardName(entry.owner) || members.includes(entry.owner),
    ).map(scriptPathOf);
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
        expect(API_BY_EVENT.onBeforeRequest.members).toContain('request');
        expect(API_BY_EVENT.onResponse.members).toEqual(
            expect.arrayContaining(['request', 'response']),
        );
        expect(API_BY_EVENT.onBeforeConnect.members).toContain('request');
        expect(API_BY_EVENT.onConnect.members).toContain('socket');
        expect(API_BY_EVENT.onMessage.members).toEqual(
            expect.arrayContaining(['message', 'socket']),
        );
    });
});

describe('SCRIPT_API', () => {
    it('names every member once, under something some event shows', () => {
        const names = SCRIPT_API.map(({ name }) => name);
        const shown = Object.values(API_BY_EVENT).flatMap(({ members }) => members);

        expect(new Set(names).size).toBe(names.length);
        expect(
            SCRIPT_API.every(({ owner }) => isStandardName(owner) || shown.includes(owner)),
        ).toBe(true);
    });

    it('gives each member a signature and the key of its explanation', () => {
        expect(SCRIPT_API.every(({ signature }) => signature.length > 0)).toBe(true);
        expect(SCRIPT_API.map(({ docKey }) => docKey)).toEqual(
            SCRIPT_API.map(({ name }) => `script.api.${name}`),
        );
    });

    it('names each parameter as its signature does, with the key of its explanation', () => {
        for (const { name, parameters, signature } of SCRIPT_API) {
            for (const parameter of parameters) {
                expect(signature).toMatch(
                    new RegExp(String.raw`[(,] ?(?:\.\.\.)?${parameter.name}\??:`),
                );
                expect(parameter.docKey).toBe(`script.param.${name}.${parameter.name}`);
            }
        }
    });

    it('gives the full names, under mandor, and no short one', () => {
        const paths = SCRIPT_API.map(scriptPathOf);

        expect(paths).toEqual(
            expect.arrayContaining([
                'console.log',
                'atob',
                'mandor.variables.get',
                'mandor.request.headers.set',
                'mandor.response.time',
                'mandor.sendRequest',
            ]),
        );
        expect(paths.filter((path) => /vars|timeMs/.test(path))).toEqual([]);
    });

    it.each(scriptEventSchema.options)(
        'matches what the guest defines for %s, name by name',
        async (event) => {
            expect((await foundIn(event)).sort()).toEqual(namesOf(event).sort());
        },
    );
});
