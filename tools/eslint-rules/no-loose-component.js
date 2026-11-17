/**
 * `components/` names a role, not a place. Opened flat it answers the one question nobody asks —
 * which of these files are components — and hides the one everybody does: which part of the
 * screen this draws. Seventeen names down a column, each repeating the prefix of the feature that
 * already contains them, is a directory listing pretending to be a layout.
 *
 * So the drawer holds folders and the folders hold files, and each folder is a zone of the
 * screen: what sits in the strip along the top, what sits in the lateral, what a row of the list
 * is made of. Opening one is opening that part of the app. The name of the zone is on the folder,
 * which is why the file inside it does not have to carry it again.
 *
 * A package with no zones does not need the drawer at all: the file goes where the rest of the
 * package lives. Inventing a folder to hold one file is the same emptiness with more clicks.
 */

import { basename, dirname } from 'node:path';

/** @type {import('eslint').Rule.RuleModule} */
export const noLooseComponent = {
    meta: {
        type: 'problem',
        docs: { description: 'A component lives in the folder of the zone it draws.' },
        schema: [],
        messages: {
            loose:
                '"{{name}}" sits straight in `components/`, which says its role and not its ' +
                'place. Move it into the folder of the zone it draws.',
        },
    },
    create(context) {
        if (basename(dirname(context.filename)) !== 'components') {
            return {};
        }

        return {
            Program(node) {
                const name = basename(context.filename);

                context.report({ node, messageId: 'loose', data: { name } });
            },
        };
    },
};
