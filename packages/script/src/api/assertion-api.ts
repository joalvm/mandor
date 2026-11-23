import type { ApiParameter } from './script-api.js';

/** A word of what `mandor.expect(value)` gives back: a word of the chain, a verb or a flag. */
export type AssertionWord = {
    name: string;
    /** A chain word and a flag are read as a property; a verb is called. */
    kind: 'chain' | 'flag' | 'verb';
    /** For a verb, its call signature; for the rest, nothing. */
    signature?: string;
    docKey: string;
    parameters: readonly ApiParameter[];
};

/** The chain words: they read well and assert nothing. One text explains them all. */
const CHAIN = ['to', 'be', 'been', 'is', 'that', 'and', 'have', 'has', 'with', 'of'];

const FLAGS = ['true', 'false', 'null', 'undefined', 'exist'];

function word(kind: AssertionWord['kind'], name: string, docKey = name): AssertionWord {
    return { name, kind, docKey: `script.assertion.${docKey}`, parameters: [] };
}

function verb(name: string, signature: string, parameters: readonly string[]): AssertionWord {
    return {
        ...word('verb', name),
        signature,
        parameters: parameters.map((parameter) => ({
            name: parameter,
            docKey: `script.assertionParam.${name}.${parameter}`,
        })),
    };
}

/** The subset of chai the guest of `expect` gives, word by word: the types and the docs read it. */
export const ASSERTION_API: readonly AssertionWord[] = [
    word('chain', 'not'),
    ...CHAIN.map((name) => word('chain', name, 'chain')),
    verb('equal', '(expected: unknown): Assertion', ['expected']),
    verb('eql', '(expected: unknown): Assertion', ['expected']),
    verb('include', '(item: unknown): Assertion', ['item']),
    verb('match', '(pattern: RegExp): Assertion', ['pattern']),
    verb('a', '(type: string): Assertion', ['type']),
    verb('an', '(type: string): Assertion', ['type']),
    verb('property', '(name: string, value?: unknown): Assertion', ['name', 'value']),
    verb('lengthOf', '(length: number): Assertion', ['length']),
    verb('above', '(limit: number): Assertion', ['limit']),
    verb('below', '(limit: number): Assertion', ['limit']),
    ...FLAGS.map((name) => word('flag', name)),
];
