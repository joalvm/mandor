import { describe, expect, it } from 'vitest';

import { fillPathParams } from '../../../../src/main/request/path-params.js';

describe('filling the path parameters of a url', () => {
    it('puts the value of each {name} of the path, encoded', () => {
        expect(fillPathParams('http://api.test/pets/{petId}', [['petId', 'a b/c']])).toEqual({
            ok: true,
            url: 'http://api.test/pets/a%20b%2Fc',
        });
        expect(
            fillPathParams('http://api.test/{owner}/pets/{petId}', [
                ['petId', '7'],
                ['owner', 'mandor'],
            ]),
        ).toEqual({ ok: true, url: 'http://api.test/mandor/pets/7' });
    });

    it('names the parameter that has no row', () => {
        expect(fillPathParams('http://api.test/pets/{petId}', [['other', '1']])).toEqual({
            ok: false,
            name: 'petId',
        });
    });

    it('leaves the host, the query and the fragment as they are', () => {
        expect(
            fillPathParams('http://api.test:8080/pets/{petId}?filter={x}#{y}', [['petId', '7']]),
        ).toEqual({ ok: true, url: 'http://api.test:8080/pets/7?filter={x}#{y}' });
        expect(fillPathParams('http://api.test?q={x}', [])).toEqual({
            ok: true,
            url: 'http://api.test?q={x}',
        });
    });

    it('leaves alone what is not a parameter: a double brace, a brace with no name', () => {
        expect(fillPathParams('http://api.test/a/{{raw}}/{}/{1x}', [['raw', 'no']])).toEqual({
            ok: true,
            url: 'http://api.test/a/{{raw}}/{}/{1x}',
        });
    });

    it('takes the first row of a name repeated, and a url with no authority as a path', () => {
        expect(
            fillPathParams('/pets/{petId}', [
                ['petId', '1'],
                ['petId', '2'],
            ]),
        ).toEqual({ ok: true, url: '/pets/1' });
    });
});
