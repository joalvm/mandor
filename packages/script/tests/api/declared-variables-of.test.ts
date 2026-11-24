import { describe, expect, it } from 'vitest';

import { declaredVariablesOf } from '../../src/api/declared-variables-of.js';

describe('declaredVariablesOf', () => {
    it('finds the name a script gives a variable, in any quotes', () => {
        expect(
            declaredVariablesOf([
                'mandor.variables.set("token", 1);',
                "mandor.variables.set('user', 2);\nmandor.variables.set(`id`, 3);",
            ]),
        ).toEqual(['token', 'user', 'id']);
    });

    it('reads a call written across spaces and lines', () => {
        expect(declaredVariablesOf(['mandor . variables\n  .set(\n  "token", 1);'])).toEqual([
            'token',
        ]);
    });

    it('gives each name once, in the order the chain declares it', () => {
        expect(
            declaredVariablesOf(['mandor.variables.set("a", 1);', 'mandor.variables.set("a", 2);']),
        ).toEqual(['a']);
    });

    /** A name built while the script runs is not one the editor can know. */
    it('leaves out a name built at run time', () => {
        expect(
            declaredVariablesOf([
                'mandor.variables.set(`id-${n}`, 1);',
                'mandor.variables.set(name, 1);',
                'mandor.variables.set("", 1);',
                'mandor.variables.set("a\\"b", 1);',
            ]),
        ).toEqual([]);
    });

    it('keeps a template that only holds a dollar', () => {
        expect(declaredVariablesOf(['mandor.variables.set(`$price`, 1);'])).toEqual(['$price']);
    });

    it('reads nothing else as a declaration', () => {
        expect(
            declaredVariablesOf(['mandor.variables.get("a");', 'other.variables.set("b", 1);']),
        ).toEqual([]);
    });
});
