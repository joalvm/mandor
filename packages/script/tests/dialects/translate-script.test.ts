import { describe, expect, it } from 'vitest';

import { foreignUsesOf, translateScript } from '../../src/dialects/translate-script.js';

function translated(source: string): string {
    return translateScript(source).text;
}

describe('translateScript', () => {
    it('keeps the comments and the blanks of the script', () => {
        expect(translated('// the token\npm.environment.set( "token" ,  1 ); /* kept */\n')).toBe(
            '// the token\nmandor.variables.set( "token" ,  1 ); /* kept */\n',
        );
    });

    it('gives the edits in the offsets of the script as it came', () => {
        expect(translateScript('x;\npm.globals.get("a");').edits).toEqual([
            { from: 3, text: 'mandor.variables.get', to: 17 },
        ]);
    });

    it('leaves a script that does not parse as it came, and says so', () => {
        expect(translateScript('pm.environment.get("a"')).toEqual({
            edits: [],
            parsed: false,
            text: 'pm.environment.get("a"',
            untranslated: [],
        });
    });

    it('reads a script that returns or awaits at its top', () => {
        expect(translated('await pm.sendRequest("u");\nreturn;')).toBe(
            'await mandor.sendRequest("u");\nreturn;',
        );
    });

    it('rewrites only the uses that touch the range', () => {
        const source = 'pm.globals.get("a");\npm.globals.get("b");';

        expect(translateScript(source, { from: 21, to: 41 }).text).toBe(
            'pm.globals.get("a");\nmandor.variables.get("b");',
        );
    });

    describe('a root the script declares is its own', () => {
        it.each([
            ['a constant', 'const pm = make();\npm.environment.get("a");'],
            ['a parameter', 'function run(res) {\n    return res.status;\n}'],
            ['a function', 'function test() {}\ntest();'],
            ['a caught error', 'try { go(); } catch (req) { req.getUrl(); }'],
            ['a part of a pattern', 'const { expect } = chai;\nexpect(1);'],
        ])('as %s', (_kind, source) => {
            expect(translateScript(source)).toMatchObject({ text: source, untranslated: [] });
        });
    });

    it('never touches mandor', () => {
        expect(foreignUsesOf('mandor.variables.get("a");')).toEqual([]);
    });

    it('leaves a name past what the table knows', () => {
        expect(translateScript('const at = pm.test.index();')).toMatchObject({
            text: 'const at = pm.test.index();',
            untranslated: [{ dialect: 'postman', from: 11, to: 24, translatable: false }],
        });
    });

    it('leaves a member read by a computed key, and marks the root', () => {
        expect(translateScript('pm["environment"].get("a");').untranslated).toEqual([
            { dialect: 'postman', from: 0, to: 2, translatable: false },
        ]);
    });

    it('leaves a name that is also the key of an object', () => {
        expect(translated('register({ test });')).toBe('register({ test });');
    });

    describe('a request sent', () => {
        it('that is already awaited keeps its await', () => {
            expect(translated('const a = await pm.sendRequest(options);')).toBe(
                'const a = await mandor.sendRequest(options);',
            );
        });

        it('that is read on is renamed alone', () => {
            expect(translated('pm.sendRequest(options).then(show);')).toBe(
                'mandor.sendRequest(options).then(show);',
            );
        });

        it('inside an async function is awaited there', () => {
            expect(translated('async function go() {\n    pm.sendRequest(options);\n}')).toBe(
                'async function go() {\n    await mandor.sendRequest(options);\n}',
            );
        });

        it('inside a function that cannot await stays marked', () => {
            expect(translateScript('[1].forEach(() => pm.sendRequest(options));')).toMatchObject({
                edits: [],
                untranslated: [{ dialect: 'postman', from: 18, to: 32, translatable: false }],
            });
        });

        it('with a callback stays marked, since it changes how the script flows', () => {
            expect(
                translateScript('pm.sendRequest(options, (error, answer) => {});').untranslated,
            ).toEqual([{ dialect: 'postman', from: 0, to: 14, translatable: false }]);
        });
    });

    describe('a header added', () => {
        it('as a pair of names written short keeps them', () => {
            expect(translated('pm.request.headers.add({ key, value });')).toBe(
                'mandor.request.headers.set(key, value);',
            );
        });

        it.each([
            ['the value first', 'pm.request.headers.add({ value: "1", key: "a" });'],
            ['a field more', 'pm.request.headers.add({ key: "a", value: "1", disabled: true });'],
            ['a computed name', 'pm.request.headers.add({ ["key"]: "a", value: "1" });'],
            ['a spread', 'pm.request.headers.add({ ...pair, value: "1" });'],
            ['a method', 'pm.request.headers.add({ key() {}, value: "1" });'],
            ['a text for a name', 'pm.request.headers.add({ "key": "a", value: "1" });'],
            ['two arguments', 'pm.request.headers.add({ key: "a", value: "1" }, 0);'],
            ['a text', 'pm.request.headers.add("a: 1");'],
            ['nothing', 'pm.request.headers.add();'],
            ['no call', 'const add = pm.request.headers.add;'],
        ])('with %s stays marked', (_shape, source) => {
            expect(translateScript(source)).toMatchObject({
                text: source,
                untranslated: [{ translatable: false }],
            });
        });
    });
});

describe('foreignUsesOf', () => {
    it('finds each use of another app, with its whole chain and whether it has a match', () => {
        expect(
            foreignUsesOf('pm.environment.get("a");\nbru.getProcessEnv("b");\nres.body.id;'),
        ).toEqual([
            { dialect: 'postman', from: 0, to: 18, translatable: true },
            { dialect: 'bruno', from: 25, to: 42, translatable: false },
            { dialect: 'bruno', from: 49, to: 60, translatable: true },
        ]);
    });

    it('finds none in a script that does not parse', () => {
        expect(foreignUsesOf('pm.environment.get(')).toEqual([]);
    });
});
