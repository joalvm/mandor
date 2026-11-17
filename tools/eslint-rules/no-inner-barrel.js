/**
 * A barrel re-exports without adding anything, and the cost lands downstream:
 * bundlers stop tree-shaking, test runners load the whole folder to resolve one
 * symbol, and go-to-definition stops at the barrel instead of the source. One per
 * package and one per feature is the public API; a second one inside is a detour.
 */

import { isBarrel } from './barrel.js';

/** @type {import('eslint').Rule.RuleModule} */
export const noInnerBarrel = {
    meta: {
        type: 'problem',
        docs: { description: 'Only the barrel of a package or a feature re-exports.' },
        schema: [],
        messages: {
            inner: 'Re-export belongs to the barrel. Import the module that defines the symbol.',
        },
    },
    create(context) {
        if (isBarrel(context.filename)) {
            return {};
        }

        return {
            'ExportNamedDeclaration[source]'(node) {
                context.report({ node, messageId: 'inner' });
            },
            ExportAllDeclaration(node) {
                context.report({ node, messageId: 'inner' });
            },
        };
    },
};
