import { describe, expect, it } from 'vitest';

import { compactJson, trailingCommas, wireJson } from '../../src/index.js';

describe('the JSON a JSONC text sends', () => {
    it('leaves the comments and the trailing commas in the editor', () => {
        const draft = '{\n  // hola\n  "a": 1, /* va */\n  "b": [1, 2,]\n}';

        expect(wireJson(draft)).toBe('{\n  \n  "a": 1, \n  "b": [1, 2]\n}');
    });

    it('drops the comma a commented-out last member leaves hanging', () => {
        const draft = '{\n  "event": "DeviceLogin",\n  // "data": {}\n}';

        expect(JSON.parse(wireJson(draft))).toEqual({ event: 'DeviceLogin' });
    });

    it('changes nothing in a text that had neither', () => {
        const draft = '{ "id": "{{pedidoId}}", "list": [1, 2] }';

        expect(wireJson(draft)).toBe(draft);
    });

    it('keeps the comment and comma lookalikes that live inside a string', () => {
        const draft = '{ "url": "http://x.com/a", "q": "say \\"/* hi */\\", ]" } /* c */';

        expect(wireJson(draft)).toBe('{ "url": "http://x.com/a", "q": "say \\"/* hi */\\", ]" } ');
    });

    it('cleans a text that only reads as JSON once the environment fills it', () => {
        expect(wireJson('{ "token": {{token}}, // c\n}')).toBe('{ "token": {{token}} \n}');
    });

    it('keeps a comma nothing closes after, as written', () => {
        expect(wireJson('[1, 2,')).toBe('[1, 2,');
    });
});

describe('the trailing commas of a JSONC text', () => {
    it('finds each comma a closer follows, across comments and line breaks', () => {
        const draft = '{ "a": [1,], "b": 2, // c\n}';

        expect(trailingCommas(draft)).toEqual([9, 19]);
    });

    it('finds none between members or inside a string', () => {
        expect(trailingCommas('{ "a": 1, "b": ",}" }')).toEqual([]);
    });
});

describe('the JSON a JSONC text sends, on one line', () => {
    it('leaves the comments, the trailing commas and the spacing between tokens', () => {
        const draft = '{\n    "email": "a@b.test",\n    "password": "x"\n    //"password": "y"\n}';

        expect(compactJson(draft)).toBe('{"email":"a@b.test","password":"x"}');
    });

    it('keeps the spaces a string holds, and cleans a text that does not parse yet', () => {
        expect(compactJson('{ "a b": "c  d" ,\n "n": {{count}} , }')).toBe(
            '{"a b":"c  d","n":{{count}}}',
        );
    });
});
