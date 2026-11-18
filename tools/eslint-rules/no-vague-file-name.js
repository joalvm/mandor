/**
 * A file called `utils.ts` is a file that never decided what it is about, so every
 * unrelated helper ends up inside it. Naming the file after its subject is what
 * keeps the next helper out: it has nowhere to hide. Cohesion itself cannot be
 * linted, but a name that promises a category instead of a subject can.
 *
 * `index` is on the list too. A barrel is exempt by shape; anywhere else the name
 * describes a folder, not what the file holds.
 */

import { basename, extname } from 'node:path';

import { isBarrel } from './barrel.js';

const VAGUE_NAMES = new Set([
    'common',
    'constants',
    'errors',
    'helper',
    'helpers',
    'index',
    'misc',
    'shared',
    'stuff',
    'types',
    'util',
    'utils',
]);

/** @type {import('eslint').Rule.RuleModule} */
export const noVagueFileName = {
    meta: {
        type: 'problem',
        docs: { description: 'A file is named after its subject, not after a category.' },
        schema: [],
        messages: {
            vague: '"{{name}}" names a category, not a subject. Name the file after what it exports.',
        },
    },
    create(context) {
        const name = basename(context.filename, extname(context.filename));

        if (isBarrel(context.filename) || !VAGUE_NAMES.has(name)) {
            return {};
        }

        return {
            Program(node) {
                context.report({ node, messageId: 'vague', data: { name } });
            },
        };
    },
};
