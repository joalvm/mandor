import {
    headerAdded,
    readAs,
    renamed,
    sentAndAwaited,
    type DialectRule,
    type DialectTable,
} from './dialect.js';

/** Where Postman keeps variables. `mandor` reads them all as the one resolved view. */
export const POSTMAN_SCOPES = ['environment', 'variables', 'collectionVariables', 'globals'];

/** What a scope does that `mandor.variables` does too. `unset` has no match and stays marked. */
const VARIABLE_VERBS = ['get', 'set', 'has'];

type Entry = readonly [string, DialectRule];

function variablesOf(root: string, scopes: readonly string[]): Entry[] {
    return scopes.flatMap((scope) =>
        VARIABLE_VERBS.map((verb): Entry => [
            `${root}.${scope}.${verb}`,
            renamed(`mandor.variables.${verb}`),
        ]),
    );
}

/** The names under `request` and `response` that `mandor` has, by their path below the root. */
const MESSAGE_RULES: readonly Entry[] = [
    ['variables.replaceIn', renamed('mandor.variables.replaceIn')],
    ['request.headers.add', headerAdded('mandor.request.headers.set')],
    ['request.headers.upsert', headerAdded('mandor.request.headers.set')],
    ['request.headers.get', renamed('mandor.request.headers.get')],
    ['request.headers.has', renamed('mandor.request.headers.has')],
    ['request.headers.remove', renamed('mandor.request.headers.delete')],
    ['request.method', readAs('mandor.request.method')],
    ['response.code', readAs('mandor.response.status')],
    ['response.responseTime', readAs('mandor.response.time')],
    ['response.json', renamed('mandor.response.json')],
    ['response.text', renamed('mandor.response.text')],
    ['response.headers.get', renamed('mandor.response.headers.get')],
    ['response.headers.has', renamed('mandor.response.headers.has')],
    ['test', renamed('mandor.test')],
    ['expect', renamed('mandor.expect')],
    ['sendRequest', sentAndAwaited('mandor.sendRequest')],
];

/**
 * The rules of an API shaped like that of Postman, under one root and with its own scopes of
 * variables. Insomnia follows Postman: its table is this one under `insomnia`.
 */
export function postmanShaped(root: string, scopes: readonly string[]): Map<string, DialectRule> {
    return new Map([
        ...variablesOf(root, scopes),
        ...MESSAGE_RULES.map(([path, rule]): Entry => [`${root}.${path}`, rule]),
    ]);
}

/** What the older API of Postman wrote under `postman.`, before `pm` came. */
const LEGACY_RULES: readonly Entry[] = [
    ['postman.getEnvironmentVariable', renamed('mandor.variables.get')],
    ['postman.setEnvironmentVariable', renamed('mandor.variables.set')],
    ['postman.getGlobalVariable', renamed('mandor.variables.get')],
    ['postman.setGlobalVariable', renamed('mandor.variables.set')],
];

/** What a script of Postman names, and how `mandor.` writes it. */
export const POSTMAN_DIALECT: DialectTable = {
    dialect: 'postman',
    roots: ['pm', 'postman'],
    rules: new Map([...postmanShaped('pm', POSTMAN_SCOPES), ...LEGACY_RULES]),
};
