import { EMPTY_SCRIPT_CONTEXT, type ScriptContext } from '@mandor/script';
import { describe, expect, it } from 'vitest';

import { scriptGhostTextOf, scriptSuggestionsOf } from '../../src/lib/script-completions.js';

function describeKey(key: string): string {
    return `<${key}>`;
}

const CONTEXT: ScriptContext = {
    headers: ['Authorization', 'x-trace-id'],
    sample: { data: { token: 'abc', user: { id: 7 } } },
    variables: [
        { name: 'token', origin: 'environment', secret: true, value: '••••' },
        { name: 'base-url', origin: 'collection', secret: false, value: 'https://api.test' },
        { name: 'chained', origin: 'script', secret: false, value: '' },
    ],
};

/** What the list offers with the caret at the end of `text`. */
function suggestionsAt(text: string, context: ScriptContext = CONTEXT, event = 'onResponse') {
    return scriptSuggestionsOf(event as 'onResponse', context, describeKey)(text, text.length);
}

function labelsAt(text: string, context?: ScriptContext, event?: string) {
    return suggestionsAt(text, context, event).map(({ label }) => label);
}

describe('the suggestions of a script with what the editor knows of its place', () => {
    it('name the variables inside the text of variables.get, set and has', () => {
        expect(labelsAt('mandor.variables.get("')).toEqual(['token', 'base-url', 'chained']);
        expect(labelsAt("mandor.variables.set('to")).toEqual(['token', 'base-url', 'chained']);
        expect(labelsAt('mandor . variables . has ( `')).toEqual(['token', 'base-url', 'chained']);
    });

    it('show a value as it came, masked when it is a secret, and nothing when it is empty', () => {
        const [token, base, chained] = suggestionsAt('mandor.variables.get("');

        expect(token).toMatchObject({
            detail: '••••',
            documentation: '<script.completion.origin.environment> · <script.completion.secret>',
            kind: 'variable',
        });
        expect(base).toMatchObject({
            detail: 'https://api.test',
            documentation: '<script.completion.origin.collection>',
        });
        expect(chained?.detail).toBeUndefined();
    });

    /** A name with a dash is no word: the whole of what is written after the quote is replaced. */
    it('replace what is written after the quote', () => {
        const text = 'const a = 1;\nmandor.variables.get("base-u';

        expect(suggestionsAt(text)[0]?.from).toBe(text.length - 'base-u'.length);
    });

    it('add the variables the script itself declares, once each', () => {
        const text = [
            'mandor.variables.set("fresh", 1);',
            "mandor.variables.set('token', 2);",
            'mandor.variables.get("',
        ].join('\n');
        const declared = suggestionsAt(text).at(-1);

        expect(labelsAt(text)).toEqual(['token', 'base-url', 'chained', 'fresh']);
        expect(declared).toMatchObject({ documentation: '<script.completion.origin.script>' });
    });

    it('name the headers of the request inside the text of headers.get, has and delete', () => {
        expect(labelsAt('mandor.request.headers.get("')).toEqual(['Authorization', 'x-trace-id']);
        expect(labelsAt("mandor.request.headers.delete('x-")).toEqual([
            'Authorization',
            'x-trace-id',
        ]);
        expect(suggestionsAt('mandor.request.headers.has("x-')[1]).toMatchObject({
            from: 'mandor.request.headers.has("'.length,
            kind: 'field',
        });
    });

    it('name nothing inside a text that is no name of a variable or a header', () => {
        expect(labelsAt('console.log("')).toEqual([]);
        expect(labelsAt('mandor.variables.get("a") + "')).toEqual([]);
    });

    it('offer the snippets of the moment where a statement starts', () => {
        expect(labelsAt('')).toEqual([
            '<script.snippet.variableFromResponse>',
            '<script.snippet.statusTest>',
            '<script.snippet.fieldTest>',
            '<script.snippet.sendRequest>',
        ]);
        expect(labelsAt('    te', CONTEXT, 'onBeforeRequest')).toEqual([
            '<script.snippet.headerFromVariable>',
            '<script.snippet.sendRequest>',
        ]);
        expect(labelsAt('', CONTEXT, 'onMessage')).toEqual([
            '<script.snippet.variableFromMessage>',
        ]);
    });

    it('write a snippet with its places to fill', () => {
        expect(suggestionsAt('')[0]).toMatchObject({
            insertText: 'mandor.variables.set("${1:name}", mandor.response.json().${2:field});',
            kind: 'snippet',
        });
    });

    it('offer no snippet in the middle of an expression', () => {
        expect(labelsAt('mandor.')).toEqual([]);
        expect(labelsAt('const a = mandor')).toEqual([]);
    });
});

/** What the editor proposes greyed with the caret at the end of `before` and `after` behind it. */
function ghostAt(before: string, after = '', event = 'onResponse', context = CONTEXT) {
    return scriptGhostTextOf(event as 'onResponse', context)?.(`${before}${after}`, before.length);
}

describe('the text a script editor proposes after the caret', () => {
    it('saves the field of the sample named like a variable of the environment', () => {
        expect(ghostAt('mandor.variables.set(')).toBe(
            '"token", mandor.response.json().data.token)',
        );
    });

    it('reads the frame in a moment of messages', () => {
        expect(ghostAt('mandor.variables.set( ', '', 'onMessage')).toBe(
            '"token", mandor.message.json().data.token)',
        );
    });

    it('leaves out the parenthesis the text already closes', () => {
        expect(ghostAt('mandor.variables.set(', ');')).toBe(
            '"token", mandor.response.json().data.token',
        );
    });

    it('proposes nothing anywhere else', () => {
        expect(ghostAt('mandor.variables.get(')).toBeUndefined();
        expect(ghostAt('mandor.variables.set("a", ')).toBeUndefined();
    });

    it('is none in a moment with no sample to read', () => {
        expect(scriptGhostTextOf('onBeforeRequest', CONTEXT)).toBeUndefined();
    });

    it('is none when no variable of the environment is named like a field', () => {
        const collectionOnly: ScriptContext = {
            ...CONTEXT,
            variables: [{ name: 'token', origin: 'collection', secret: false, value: 'a' }],
        };

        expect(scriptGhostTextOf('onResponse', collectionOnly)).toBeUndefined();
        expect(scriptGhostTextOf('onResponse', EMPTY_SCRIPT_CONTEXT)).toBeUndefined();
    });
});
