import { describe, expect, it } from 'vitest';

import { foldImportedScripts } from '../../src/script/fold-imported-scripts.js';

const POSTMAN = {
    event: 'onBeforeRequest',
    dialect: 'postman',
    source: 'pm.environment.get("a");',
};

describe('foldImportedScripts', () => {
    it('puts the imported text behind the own one of the same moment, a blank line between', () => {
        expect(
            foldImportedScripts({ onBeforeRequest: { source: 'console.log(1);' } }, [POSTMAN]),
        ).toEqual({ onBeforeRequest: { source: 'console.log(1);\n\npm.environment.get("a");' } });
    });

    it('puts it before the own one when asked', () => {
        expect(
            foldImportedScripts(
                { onBeforeRequest: { source: 'console.log(1);' } },
                [POSTMAN],
                'before',
            ),
        ).toEqual({ onBeforeRequest: { source: 'pm.environment.get("a");\n\nconsole.log(1);' } });
    });

    it('gives a moment with no own script one of its own, switched on', () => {
        expect(
            foldImportedScripts(undefined, [
                {
                    event: 'onResponse',
                    dialect: 'insomnia',
                    source: 'insomnia.test("x", () => {});',
                },
            ]),
        ).toEqual({ onResponse: { source: 'insomnia.test("x", () => {});' } });
    });

    it('keeps the switch of the own script it folds into', () => {
        expect(
            foldImportedScripts({ onBeforeRequest: { source: 'a', enabled: false } }, [POSTMAN]),
        ).toEqual({
            onBeforeRequest: { source: 'a\n\npm.environment.get("a");', enabled: false },
        });
    });

    it('leaves the other moments as they were', () => {
        expect(foldImportedScripts({ onResponse: { source: 'b' } }, [POSTMAN])).toEqual({
            onResponse: { source: 'b' },
            onBeforeRequest: { source: 'pm.environment.get("a");' },
        });
    });

    it('folds every imported script of a moment, in the order they came', () => {
        expect(
            foldImportedScripts(undefined, [
                { event: 'onResponse', source: 'one' },
                { event: 'onResponse', source: 'two' },
            ]),
        ).toEqual({ onResponse: { source: 'one\n\ntwo' } });
    });

    it('takes an own script with no text as no text', () => {
        expect(foldImportedScripts({ onBeforeRequest: { source: '' } }, [POSTMAN])).toEqual({
            onBeforeRequest: { source: 'pm.environment.get("a");' },
        });
    });

    it.each([
        ['nothing', undefined],
        ['an empty list', []],
        ['something that is not the old shape', [{ event: 'onMessage', source: 'x' }]],
        ['no list', 'pm.test()'],
    ])('folds nothing out of %s', (_name, imported) => {
        expect(foldImportedScripts({ onResponse: { source: 'b' } }, imported)).toEqual({
            onResponse: { source: 'b' },
        });
        expect(foldImportedScripts(undefined, imported)).toBeUndefined();
    });
});
