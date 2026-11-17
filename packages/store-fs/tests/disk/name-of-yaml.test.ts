import { describe, expect, it } from 'vitest';

import { nameOfYaml } from '../../src/disk/name-of-yaml.js';

describe('the name a yaml text carries (name-of-yaml)', () => {
    it('gives the name of a text that parses', () => {
        expect(nameOfYaml('kind: message\nname: Pedido creado\n')).toBe('Pedido creado');
    });

    /** The warning of a file that cannot be read still says whose file it is. */
    it('gives the name of a text whose later lines do not parse', () => {
        expect(nameOfYaml('name: Pedido roto\nurl: [unclosed\n')).toBe('Pedido roto');
    });

    it.each([
        ['has no name', 'kind: message\n'],
        ['has an empty name', 'name: ""\n'],
        ['has a name that is not text', 'name: [a, b]\n'],
        ['has a number as name', 'name: 7\n'],
        ['is not a map', '- a\n- b\n'],
        ['is empty', ''],
        ['is not there', null],
    ])('gives nothing when the text %s', (_case, text) => {
        expect(nameOfYaml(text)).toBe('');
    });

    it('never throws on a text that is no yaml at all', () => {
        expect(nameOfYaml('{{{ : : \u0000 ]]]')).toBe('');
    });
});
