import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import type { ScriptEvent } from '../../src/api/script-api.js';
import { EMPTY_SCRIPT_CONTEXT, type ScriptContext } from '../../src/api/script-context.js';
import { scriptTypesOf } from '../../src/api/script-types-of.js';

/**
 * The options the editor checks a script with: JavaScript, one module per script, no DOM, and
 * not strict, since a script is JavaScript and `undefined` where a text goes is what JS allows.
 */
const OPTIONS: ts.CompilerOptions = {
    allowJs: true,
    strict: false,
    checkJs: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleDetection: ts.ModuleDetectionKind.Force,
    lib: ['lib.es2023.d.ts'],
    types: [],
};

function describeKey(docKey: string): string {
    return `text of ${docKey}`;
}

/** What TypeScript says of `script` against the declarations of `event`, one `code message` each. */
function diagnosticsOf(
    event: ScriptEvent,
    script: string,
    context: ScriptContext = EMPTY_SCRIPT_CONTEXT,
): string[] {
    const files = new Map([
        ['/script.js', script],
        ['/mandor.d.ts', scriptTypesOf(event, describeKey, context)],
    ]);
    const host = ts.createCompilerHost(OPTIONS);
    const fromDisk = host.getSourceFile.bind(host);

    host.getSourceFile = (name, version) => {
        const text = files.get(name);

        return text === undefined
            ? fromDisk(name, version)
            : ts.createSourceFile(name, text, version);
    };

    host.fileExists = (name) => files.has(name) || ts.sys.fileExists(name);

    const program = ts.createProgram([...files.keys()], OPTIONS, host);

    return ts
        .getPreEmitDiagnostics(program)
        .map(
            ({ code, messageText }) =>
                `${String(code)} ${ts.flattenDiagnosticMessageText(messageText, '\n')}`,
        );
}

const VALID: Record<ScriptEvent, string> = {
    onBeforeRequest: `
const token = mandor.variables.get('token');
mandor.request.headers.set('Authorization', 'Bearer ' + token);
mandor.request.url = mandor.variables.replaceIn('{{base}}/items');
mandor.request.body = JSON.stringify({ a: 1 });
const params = new URLSearchParams('a=1');
console.log(params.get('a'), atob(btoa('x')), [...params.keys()]);
const response = await mandor.sendRequest({ url: 'https://example.com', headers: { a: 1 } });
mandor.variables.set('status', response.status);
`,
    onResponse: `
const response = await mandor.sendRequest({ url: 'https://example.com' });
mandor.test('status', () => {
    mandor.expect(mandor.response.status).to.equal(200);
    mandor.expect(mandor.response.json().id).to.be.a('number');
    mandor.expect(response.text()).not.to.be.undefined;
    mandor.expect([1, 2]).to.have.lengthOf(2).and.include(1);
});
console.info(mandor.response.time, mandor.response.headers.get('x'), mandor.request.url);
`,
    onBeforeConnect: `
mandor.request.query.set('a', 1);
mandor.request.headers.delete('x');
mandor.request.url = mandor.request.url + '?b=2';
`,
    onConnect: `
mandor.socket.send(mandor.variables.get('hello'));
`,
    onMessage: `
const mandorText = mandor.message.text;
if (mandor.message.direction === 'incoming' && !mandor.message.binary) {
    mandor.socket.send(mandorText);
}
`,
};

describe('scriptTypesOf', () => {
    it.each(Object.keys(VALID) as ScriptEvent[])(
        'checks a script of %s that uses what its event shows without a diagnostic',
        (event) => {
            expect(diagnosticsOf(event, VALID[event])).toEqual([]);
        },
    );

    it('makes mandor.response before the request a type error, not a silence', () => {
        expect(diagnosticsOf('onBeforeRequest', 'console.log(mandor.response.status);')).toEqual([
            "2339 Property 'response' does not exist on type 'Mandor'.",
        ]);
    });

    it('makes a write the event does not allow a type error', () => {
        expect(diagnosticsOf('onResponse', "mandor.request.url = 'x';")).toEqual([
            "2540 Cannot assign to 'url' because it is a read-only property.",
        ]);
    });

    it('lets a script declare a mandor of its own: it shadows', () => {
        expect(
            diagnosticsOf('onResponse', 'const mandor = { a: 1 };\nconsole.log(mandor.a);'),
        ).toEqual([]);
    });

    it('explains each name and each parameter in the text describe gives', () => {
        const types = scriptTypesOf('onBeforeRequest', describeKey, EMPTY_SCRIPT_CONTEXT);

        expect(types).toContain('text of script.api.variables.get');
        expect(types).toContain('@param name text of script.param.variables.get.name');
        expect(types).toContain('text of script.assertion.equal');
        expect(types).toContain('declare const mandor: Mandor;');
    });

    it('keeps a text from closing its comment', () => {
        expect(scriptTypesOf('onMessage', () => 'a */ b', EMPTY_SCRIPT_CONTEXT)).not.toMatch(
            /a \*\/ b/,
        );
    });
});

const SAMPLED: ScriptContext = { ...EMPTY_SCRIPT_CONTEXT, sample: { id: 1, user: { name: 'a' } } };

describe('scriptTypesOf with what the editor knows of the place', () => {
    it('types the JSON of the response with the shape of the sample', () => {
        expect(
            diagnosticsOf(
                'onResponse',
                'mandor.response.json().id.toFixed();\nmandor.response.json().id.toUpperCase();',
                SAMPLED,
            ),
        ).toEqual(["2339 Property 'toUpperCase' does not exist on type 'number'."]);
    });

    /** The next response may bring a field the sample lacks. */
    it('lets a script read a field the sample lacks', () => {
        expect(
            diagnosticsOf('onResponse', 'mandor.response.json().other.deeper;', SAMPLED),
        ).toEqual([]);
    });

    it('leaves the response sendRequest gives back as any', () => {
        expect(
            diagnosticsOf(
                'onResponse',
                "const other = await mandor.sendRequest({ url: 'x' });\nother.json().id.toUpperCase();",
                SAMPLED,
            ),
        ).toEqual([]);
    });

    it('types the JSON of the frame with the shape of the sample', () => {
        expect(
            diagnosticsOf('onMessage', 'mandor.message.json().user.name.getTime();', SAMPLED),
        ).toEqual(["2339 Property 'getTime' does not exist on type 'string'."]);
    });

    it('reads the JSON as anything with no sample', () => {
        expect(diagnosticsOf('onMessage', 'mandor.message.json().a.b.c();')).toEqual([]);
    });

    it('names the variables it knows, and lets a script name any other', () => {
        const context: ScriptContext = {
            ...EMPTY_SCRIPT_CONTEXT,
            variables: [
                { name: 'token', origin: 'environment', secret: true, value: '••••' },
                { name: 'id', origin: 'script', secret: false, value: '' },
            ],
        };

        expect(scriptTypesOf('onResponse', describeKey, context)).toContain(
            'type MandorVariableName = "token" | "id" | (string & {});',
        );
        expect(diagnosticsOf('onResponse', "mandor.variables.get('other');", context)).toEqual([]);
    });

    it('names any variable as a text when it knows none', () => {
        expect(scriptTypesOf('onResponse', describeKey, EMPTY_SCRIPT_CONTEXT)).toContain(
            'type MandorVariableName = string;',
        );
    });
});
