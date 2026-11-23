import type { DialectTable } from './dialect.js';
import { POSTMAN_SCOPES, postmanShaped } from './postman-dialect.js';

/** What a script of Insomnia names, and how `mandor.` writes it: the API of Postman, plus its base environment. */
export const INSOMNIA_DIALECT: DialectTable = {
    dialect: 'insomnia',
    roots: ['insomnia'],
    rules: postmanShaped('insomnia', [...POSTMAN_SCOPES, 'baseEnvironment']),
};
