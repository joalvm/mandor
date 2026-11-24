import type { RequestScripts } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    declaredInScripts,
    momentMarksOf,
    switchedScript,
    withScript,
} from '../../src/lib/script-entries.js';

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

describe('what the name of a moment tells from the list', () => {
    it('dots a moment with code and dims one switched off', () => {
        expect(momentMarksOf({ source: 'a()', enabled: false })).toEqual({
            filled: true,
            muted: true,
        });
    });

    it('says nothing of a moment with no script or only blanks', () => {
        expect(momentMarksOf(undefined)).toEqual({ filled: false, muted: false });
        expect(momentMarksOf({ source: ' \n' })).toEqual({ filled: false, muted: false });
    });
});

describe('the names the scripts of a place declare', () => {
    it('come from every level that runs for the place', () => {
        expect(
            declaredInScripts([
                { onResponse: { source: 'mandor.variables.set("id", 1);' } },
                undefined,
                { onBeforeRequest: { source: "mandor.variables.set('trace', 3);" } },
            ]),
        ).toEqual(['id', 'trace']);
    });

    /** A script switched off does not run, so it declares nothing. */
    it('leave out what a script switched off declares', () => {
        expect(
            declaredInScripts([
                {
                    onBeforeRequest: undefined,
                    onResponse: { enabled: false, source: 'mandor.variables.set("off", 1);' },
                },
            ]),
        ).toEqual([]);
    });
});
