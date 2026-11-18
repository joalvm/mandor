import type { RequestScripts } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { switchedScript, withScript } from '../../src/lib/script-entries.js';

const ANSWER_ONLY: RequestScripts = { onResponse: { source: 'b()' } };

const BOTH: RequestScripts = { onBeforeRequest: { source: 'a()' }, onResponse: { source: 'b()' } };

describe('the scripts of a level with one replaced', () => {
    it('sets the script of an event and keeps the others', () => {
        expect(withScript(ANSWER_ONLY, 'onBeforeRequest', { source: 'a()' })).toEqual(BOTH);
    });

    it('drops an empty script that would run, and the key when none is left', () => {
        expect(withScript(ANSWER_ONLY, 'onResponse', { source: '' })).toBeUndefined();
        expect(withScript(BOTH, 'onBeforeRequest', { source: '' })).toEqual(ANSWER_ONLY);
    });

    it('keeps a script switched off, even an empty one', () => {
        expect(withScript(undefined, 'onResponse', { source: '', enabled: false })).toEqual({
            onResponse: { source: '', enabled: false },
        });
    });
});

describe('the switch of a script', () => {
    it('writes only the off state, as the file keeps it', () => {
        expect(switchedScript({ source: 'a()' }, false)).toEqual({ source: 'a()', enabled: false });
        expect(switchedScript({ source: 'a()', enabled: false }, true)).toEqual({ source: 'a()' });
        expect(switchedScript(undefined, false)).toEqual({ source: '', enabled: false });
    });
});
