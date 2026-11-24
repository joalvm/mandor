import { describe, expect, it } from 'vitest';

import { ownScriptsOf } from '../../src/import/own-scripts-of.js';

function script(event: 'onBeforeRequest' | 'onResponse', source: string, enabled = true) {
    return { event, source, enabled };
}

describe('ownScriptsOf', () => {
    it('gives each moment the script the document wrote for it, as it came', () => {
        expect(
            ownScriptsOf([script('onBeforeRequest', 'pm.a()'), script('onResponse', 'pm.b()')]),
        ).toEqual({ onBeforeRequest: { source: 'pm.a()' }, onResponse: { source: 'pm.b()' } });
    });

    it('brings a script the other app switched off, switched off', () => {
        expect(ownScriptsOf([script('onResponse', 'pm.b()', false)])).toEqual({
            onResponse: { source: 'pm.b()', enabled: false },
        });
    });

    it('joins several scripts of one moment in order, with a blank line between', () => {
        expect(
            ownScriptsOf([script('onResponse', 'one()'), script('onResponse', 'two()')]),
        ).toEqual({ onResponse: { source: 'one()\n\ntwo()' } });
    });

    it('keeps only the scripts that are on when a moment mixes both', () => {
        expect(
            ownScriptsOf([script('onResponse', 'off()', false), script('onResponse', 'on()')]),
        ).toEqual({ onResponse: { source: 'on()' } });
    });

    it.each([[undefined], [[]], [[script('onResponse', '  \n')]]])(
        'gives nothing for %j',
        (scripts) => {
            expect(ownScriptsOf(scripts)).toBeUndefined();
        },
    );
});
