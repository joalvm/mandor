import { describe, expect, it } from 'vitest';

import { INSOMNIA_DIALECT } from '../../src/dialects/insomnia-dialect.js';
import { translateScript } from '../../src/dialects/translate-script.js';

function translated(source: string): string {
    return translateScript(source).text;
}

describe('INSOMNIA_DIALECT', () => {
    it('reads the root of Insomnia', () => {
        expect(INSOMNIA_DIALECT.roots).toEqual(['insomnia']);
    });

    it.each(['environment', 'variables', 'collectionVariables', 'globals', 'baseEnvironment'])(
        'writes get, set and has of insomnia.%s on mandor.variables',
        (scope) => {
            expect(
                translated(
                    `insomnia.${scope}.set("a", 1);\ninsomnia.${scope}.get("a");\ninsomnia.${scope}.has("a");`,
                ),
            ).toBe(
                'mandor.variables.set("a", 1);\nmandor.variables.get("a");\nmandor.variables.has("a");',
            );
        },
    );

    it('follows the API of Postman for the request, the response and the tests', () => {
        expect(
            translated(
                'insomnia.request.headers.add({ key: "a", value: "b" });\ninsomnia.test("ok", () => insomnia.expect(insomnia.response.code).to.equal(200));',
            ),
        ).toBe(
            'mandor.request.headers.set("a", "b");\nmandor.test("ok", () => mandor.expect(mandor.response.status).to.equal(200));',
        );
    });

    it('follows it for the assertions of the response too', () => {
        expect(translated('insomnia.response.to.have.header("a");')).toBe(
            'mandor.response.to.have.header("a");',
        );
    });

    it('says the use is of Insomnia', () => {
        expect(translateScript('insomnia.environment.unset("a");').untranslated).toEqual([
            { dialect: 'insomnia', from: 0, to: 26, translatable: false },
        ]);
    });
});
