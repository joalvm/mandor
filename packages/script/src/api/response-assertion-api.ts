import { assertionFlag, assertionVerb, CHAIN_WORDS, type AssertionWord } from './assertion-api.js';

/** The flags of a status: a class (`success` is 2XX) or one code (`notFound` is 404). */
const STATUS_FLAGS = [
    'info',
    'success',
    'redirection',
    'clientError',
    'serverError',
    'ok',
    'accepted',
    'withoutContent',
    'badRequest',
    'unauthorized',
    'unauthorised',
    'forbidden',
    'notFound',
    'notAcceptable',
    'rateLimited',
];

const BODY_FLAGS = ['error', 'json', 'withBody'];

function verb(name: string, signature: string, parameters: readonly string[]): AssertionWord {
    return assertionVerb('responseAssertion', name, signature, parameters);
}

/** Read, an assertion about the number; called, the number is the one given. */
function measure(name: string): AssertionWord {
    const type = '((expected?: number) => Assertion) & Assertion';

    return { ...assertionVerb('responseAssertion', name, type, ['expected']), kind: 'measure' };
}

/**
 * What `mandor.response.to` gives, word by word: the assertions of a response in the words of
 * Postman, so a test brought from there runs as it was. The types and the docs read it.
 */
export const RESPONSE_ASSERTION_API: readonly AssertionWord[] = [
    ...CHAIN_WORDS,
    verb('status', '(expected: number | string): ResponseAssertion', ['expected']),
    verb('statusCode', '(code: number): ResponseAssertion', ['code']),
    verb('statusCodeClass', '(digit: number): ResponseAssertion', ['digit']),
    verb('statusReason', '(reason: string): ResponseAssertion', ['reason']),
    verb('header', '(name: string, value?: string): ResponseAssertion', ['name', 'value']),
    verb('body', '(expected?: string | RegExp | object): ResponseAssertion', ['expected']),
    verb('jsonBody', '(path?: string | object, value?: unknown): ResponseAssertion', [
        'path',
        'value',
    ]),
    verb('jsonSchema', '(schema: object): ResponseAssertion', ['schema']),
    measure('responseTime'),
    measure('responseSize'),
    ...[...STATUS_FLAGS, ...BODY_FLAGS].map((name) => assertionFlag('responseAssertion', name)),
];
