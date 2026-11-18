import { describe, expect, it } from 'vitest';

import { bypassOf } from '../../src/network/proxy-bypass.js';

describe('the hosts the proxy leaves alone, as they are typed', () => {
    it('are what the commas leave, without the spaces around them', () => {
        expect(bypassOf('localhost,  *.internal ,.local')).toEqual([
            'localhost',
            '*.internal',
            '.local',
        ]);
    });

    it('drop the empty places a stray comma or a blank field leaves', () => {
        expect(bypassOf('a.test,, ,')).toEqual(['a.test']);
        expect(bypassOf('')).toEqual([]);
    });
});
