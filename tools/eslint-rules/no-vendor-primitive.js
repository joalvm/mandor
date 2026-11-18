/**
 * `@mandor/ui` is the contract, and a contract with a hole in it is a promise about one file.
 * Radix is the library that happens to be under the primitives today; the day it is another one,
 * what has to be rewritten is `packages/ui/src` and nothing else. A feature that reaches for the
 * vendor directly writes the migration nobody costed, one import at a time.
 *
 * The rule reads imports, not looks: a `Dialog.Root` opened in a feature is the same debt whether
 * it ends up looking like the app or not, because it is a second place the vendor is known.
 */

const VENDOR_UI = [/^radix-ui(?:$|\/)/, /^@radix-ui\//];

function ownsVendor(filename) {
    return /(?:^|[\\/])packages[\\/]ui[\\/]/.test(filename);
}

/** @type {import('eslint').Rule.RuleModule} */
export const noVendorPrimitive = {
    meta: {
        type: 'problem',
        docs: { description: 'The component library is known only to @mandor/ui.' },
        schema: [],
        messages: {
            vendor:
                '`{{source}}` is the library under the primitives, and only `packages/ui` ' +
                'knows it. Compose from `@mandor/ui`, or add the primitive that is missing.',
        },
    },
    create(context) {
        if (ownsVendor(context.filename)) {
            return {};
        }

        return {
            ImportDeclaration(node) {
                const source = String(node.source.value);

                if (VENDOR_UI.some((vendor) => vendor.test(source))) {
                    context.report({ node, messageId: 'vendor', data: { source } });
                }
            },
        };
    },
};
