import type { ApiParameter } from './script-api.js';

/**
 * A word of what an assertion gives back (`mandor.expect(value)` or `mandor.response.to`): a word
 * of the chain, a verb, a flag or a measure.
 */
export type AssertionWord = {
    name: string;
    /**
     * A chain word and a flag are read as a property; a verb is called. A measure is both: read,
     * the assertion goes on about a number of the response; called, it asserts that number.
     */
    kind: 'chain' | 'flag' | 'verb' | 'measure';
    /** For a verb, its call signature; for a measure, its type; for the rest, nothing. */
    signature?: string;
    docKey: string;
    parameters: readonly ApiParameter[];
};

/** Where the texts of a list of words live: `script.<space>.*` and `script.<space>Param.*`. */
type Space = 'assertion' | 'responseAssertion';

/** The chain words: they read well and assert nothing. One text explains them all. */
const CHAIN = ['to', 'be', 'been', 'is', 'that', 'and', 'have', 'has', 'with', 'of'];

const FLAGS = ['true', 'false', 'null', 'undefined', 'exist'];

function word(
    space: Space,
    kind: AssertionWord['kind'],
    name: string,
    docKey = name,
): AssertionWord {
    return { name, kind, docKey: `script.${space}.${docKey}`, parameters: [] };
}

/** A verb of `space`: its signature and its parameters, each with the key of its text. */
export function assertionVerb(
    space: Space,
    name: string,
    signature: string,
    parameters: readonly string[],
): AssertionWord {
    return {
        ...word(space, 'verb', name),
        signature,
        parameters: parameters.map((parameter) => ({
            name: parameter,
            docKey: `script.${space}Param.${name}.${parameter}`,
        })),
    };
}

/** A flag of `space`: read as a property, it asserts. */
export function assertionFlag(space: Space, name: string): AssertionWord {
    return word(space, 'flag', name);
}

/** `not` and the chain words, explained by the texts of `expect`: they mean the same anywhere. */
export const CHAIN_WORDS: readonly AssertionWord[] = [
    word('assertion', 'chain', 'not'),
    ...CHAIN.map((name) => word('assertion', 'chain', name, 'chain')),
];

function verb(name: string, signature: string, parameters: readonly string[]): AssertionWord {
    return assertionVerb('assertion', name, signature, parameters);
}

/** The subset of chai the guest of `expect` gives, word by word: the types and the docs read it. */
export const ASSERTION_API: readonly AssertionWord[] = [
    ...CHAIN_WORDS,
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
    ...FLAGS.map((name) => assertionFlag('assertion', name)),
];
