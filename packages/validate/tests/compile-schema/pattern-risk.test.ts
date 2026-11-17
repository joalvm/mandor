import { describe, expect, it } from 'vitest';

import { uncheckedPattern } from '../../src/compile-schema/pattern-risk.js';

/**
 * The runner sets the regex flags of the app: V8 reads a pattern that backtracks too much again
 * with its linear engine, and a pattern that engine does not take is the only one left exposed.
 */
describe('the patterns a schema keeps but no check reads', () => {
    it.each([
        ['a lookahead', '^(?=.*[0-9]).{8,}$'],
        ['a negative lookahead', '^(?!admin).+$'],
        ['a backreference', '^(a+)\\1$'],
        ['a named backreference', '^(?<q>[\'"]).*\\k<q>$'],
        ['a property escape, read only with u', '^\\p{L}+$'],
        ['a quantified group of quantifiers the linear engine cannot repeat', '^(a{1,100})+$'],
        ['a quantified alternation the linear engine cannot repeat', '^(a|aa){1,40}$'],
        ['a group that repeats inside an optional one, repeated', '^((a+)?b){1,40}$'],
    ])('leaves out %s', (_name, pattern) => {
        expect(uncheckedPattern(pattern)).toBe(true);
    });

    it.each([
        ['a nested quantifier the linear engine takes over', '^(a+)+$'],
        ['a long repetition of one thing', '^.{1,255}$'],
        ['a lookbehind', '(?<=@)[a-z]+'],
        ['an optional group of quantifiers', '^(\\+[0-9]{1,3})?[0-9]{1,200}$'],
        ['a lookahead written inside a class', '^[(?=]{1,300}$'],
        ['an escaped digit inside a class', '^[\\x31-\\x39]{1,300}$'],
        ['a brace that is no quantifier', '^a\\{{1,300}$'],
        ['a plain pattern', '^[0-9a-f]{8}-[0-9a-f]{4}$'],
        ['a pattern that is no regex at all', '^(a'],
        ['a risky pattern that is no regex at all', '^(a+)+)$'],
    ])('checks %s', (_name, pattern) => {
        expect(uncheckedPattern(pattern)).toBe(false);
    });
});
