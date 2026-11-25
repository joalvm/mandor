import { describe, expect, it } from 'vitest';

import { POSTMAN_DIALECT } from '../../src/dialects/postman-dialect.js';
import { translateScript } from '../../src/dialects/translate-script.js';

function translated(source: string): string {
    return translateScript(source).text;
}

describe('POSTMAN_DIALECT', () => {
    it('reads the roots of Postman, old and new', () => {
        expect(POSTMAN_DIALECT.roots).toEqual(['pm', 'postman']);
    });

    it.each(['environment', 'variables', 'collectionVariables', 'globals'])(
        'writes get, set and has of pm.%s on mandor.variables',
        (scope) => {
            expect(
                translated(
                    `pm.${scope}.set("a", 1);\npm.${scope}.get("a");\npm.${scope}.has("a");`,
                ),
            ).toBe(
                'mandor.variables.set("a", 1);\nmandor.variables.get("a");\nmandor.variables.has("a");',
            );
        },
    );

    it('leaves unset as it was, since mandor.variables has none', () => {
        expect(translateScript('pm.environment.unset("a");')).toEqual({
            edits: [],
            parsed: true,
            text: 'pm.environment.unset("a");',
            untranslated: [{ dialect: 'postman', from: 0, to: 20, translatable: false }],
        });
    });

    it('writes the variables a text names through replaceIn', () => {
        expect(translated('pm.variables.replaceIn("{{a}}");')).toBe(
            'mandor.variables.replaceIn("{{a}}");',
        );
    });

    it('writes a header added as an object as a name and a value', () => {
        expect(translated('pm.request.headers.add({ key: "X-Id", value: id });')).toBe(
            'mandor.request.headers.set("X-Id", id);',
        );
        expect(translated('pm.request.headers.upsert({key: "X-Id", value: "1"});')).toBe(
            'mandor.request.headers.set("X-Id", "1");',
        );
    });

    it('reads, tests and removes the headers of the request by name', () => {
        expect(
            translated(
                'pm.request.headers.get("a");\npm.request.headers.has("a");\npm.request.headers.remove("a");',
            ),
        ).toBe(
            'mandor.request.headers.get("a");\nmandor.request.headers.has("a");\nmandor.request.headers.delete("a");',
        );
    });

    it('reads the method of the request', () => {
        expect(translated('const verb = pm.request.method;')).toBe(
            'const verb = mandor.request.method;',
        );
    });

    it('writes the code and the time of the response by the names mandor gives them', () => {
        expect(translated('pm.response.code === 200 && pm.response.responseTime < 500;')).toBe(
            'mandor.response.status === 200 && mandor.response.time < 500;',
        );
    });

    it('keeps what the script reads past a value', () => {
        expect(translated('pm.response.code.toString();')).toBe(
            'mandor.response.status.toString();',
        );
    });

    it('reads the body and the headers of the response', () => {
        expect(
            translated(
                'pm.response.json().id;\npm.response.text();\npm.response.headers.get("a");\npm.response.headers.has("a");',
            ),
        ).toBe(
            'mandor.response.json().id;\nmandor.response.text();\nmandor.response.headers.get("a");\nmandor.response.headers.has("a");',
        );
    });

    it('writes the tests and the assertions on mandor', () => {
        expect(
            translated(
                'pm.test("ok", () => {\n    pm.expect(pm.response.code).to.equal(200);\n});',
            ),
        ).toBe(
            'mandor.test("ok", () => {\n    mandor.expect(mandor.response.status).to.equal(200);\n});',
        );
    });

    it('writes the assertions of the response on mandor.response.to, word by word', () => {
        expect(
            translated(
                'pm.response.to.have.status(200);\npm.response.to.not.be.error;\npm.response.to.have.jsonBody("id", 7);',
            ),
        ).toBe(
            'mandor.response.to.have.status(200);\nmandor.response.to.not.be.error;\nmandor.response.to.have.jsonBody("id", 7);',
        );
    });

    it('leaves an assertion of the response with a word mandor has not, and marks it', () => {
        expect(translateScript('pm.response.to.have.jsonSchema(schema);')).toEqual({
            edits: [],
            parsed: true,
            text: 'pm.response.to.have.jsonSchema(schema);',
            untranslated: [{ dialect: 'postman', from: 0, to: 30, translatable: false }],
        });
    });

    it('awaits a request sent with its options alone', () => {
        expect(translated('const answer = pm.sendRequest("https://example.com");')).toBe(
            'const answer = await mandor.sendRequest("https://example.com");',
        );
    });

    it('writes the variables of the older API on mandor.variables', () => {
        expect(
            translated(
                'postman.setEnvironmentVariable("a", 1);\npostman.getEnvironmentVariable("a");\npostman.setGlobalVariable("b", 2);\npostman.getGlobalVariable("b");',
            ),
        ).toBe(
            'mandor.variables.set("a", 1);\nmandor.variables.get("a");\nmandor.variables.set("b", 2);\nmandor.variables.get("b");',
        );
    });
});
