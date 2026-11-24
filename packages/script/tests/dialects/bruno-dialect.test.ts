import { describe, expect, it } from 'vitest';

import { BRUNO_DIALECT } from '../../src/dialects/bruno-dialect.js';
import { translateScript } from '../../src/dialects/translate-script.js';

function translated(source: string): string {
    return translateScript(source).text;
}

describe('BRUNO_DIALECT', () => {
    it('reads the roots of Bruno, the loose test and expect among them', () => {
        expect(BRUNO_DIALECT.roots).toEqual(['bru', 'req', 'res', 'test', 'expect']);
    });

    it('writes the variables of the environment and of the run on mandor.variables', () => {
        expect(
            translated(
                'bru.setEnvVar("a", 1);\nbru.getEnvVar("a");\nbru.hasEnvVar("a");\nbru.setVar("b", 2);\nbru.getVar("b");\nbru.hasVar("b");',
            ),
        ).toBe(
            'mandor.variables.set("a", 1);\nmandor.variables.get("a");\nmandor.variables.has("a");\nmandor.variables.set("b", 2);\nmandor.variables.get("b");\nmandor.variables.has("b");',
        );
    });

    it('writes the variables a text names through replaceIn', () => {
        expect(translated('bru.interpolate("{{a}}");')).toBe(
            'mandor.variables.replaceIn("{{a}}");',
        );
    });

    it('reads, writes and removes the headers of the request by name', () => {
        expect(
            translated('req.getHeader("a");\nreq.setHeader("a", "1");\nreq.deleteHeader("a");'),
        ).toBe(
            'mandor.request.headers.get("a");\nmandor.request.headers.set("a", "1");\nmandor.request.headers.delete("a");',
        );
    });

    it('reads the url and the method of the request as values', () => {
        expect(translated('const to = req.getUrl();\nconst verb = req.getMethod();')).toBe(
            'const to = mandor.request.url;\nconst verb = mandor.request.method;',
        );
    });

    it('reads the status of the response, called or read', () => {
        expect(translated('res.getStatus() === res.status;')).toBe(
            'mandor.response.status === mandor.response.status;',
        );
    });

    it('reads the body of the response as JSON, called or read', () => {
        expect(translated('res.getBody().id === res.body.id;')).toBe(
            'mandor.response.json().id === mandor.response.json().id;',
        );
    });

    it('reads a header and the time of the response', () => {
        expect(translated('res.getHeader("a");\nres.getResponseTime() > res.responseTime;')).toBe(
            'mandor.response.headers.get("a");\nmandor.response.time > mandor.response.time;',
        );
    });

    it('writes the loose test and expect on mandor', () => {
        expect(
            translated('test("ok", function () {\n    expect(res.status).to.equal(200);\n});'),
        ).toBe(
            'mandor.test("ok", function () {\n    mandor.expect(mandor.response.status).to.equal(200);\n});',
        );
    });

    it('leaves a getter called with something, since mandor reads it as a value', () => {
        expect(translateScript('req.getUrl(true);')).toMatchObject({
            text: 'req.getUrl(true);',
            untranslated: [{ dialect: 'bruno', from: 0, to: 10, translatable: false }],
        });
    });

    it('leaves a getter that is not called', () => {
        expect(translated('const read = res.getStatus;')).toBe('const read = res.getStatus;');
    });
});
