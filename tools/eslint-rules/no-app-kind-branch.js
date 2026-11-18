/**
 * A shared package does not ask which app it runs in. `packages/` is what the two apps have in
 * common, so a comparison with `'async'` or `'sync'` there is a frontier drawn in the wrong
 * place: what differs goes in through the configuration the app hands over, or a registry each
 * app fills. Holding data per app is fine — `{ async: …, sync: … }` looked up by kind is a
 * table, not a branch — and so is the app itself, which is the one place allowed to choose.
 */

const APP_KINDS = new Set(['async', 'sync']);

function isSharedSource(filename) {
    return /(?:^|[\\/])packages[\\/][^\\/]+[\\/]src[\\/]/.test(filename);
}

function isAppKind(node) {
    return node.type === 'Literal' && APP_KINDS.has(node.value);
}

/** @type {import('eslint').Rule.RuleModule} */
export const noAppKindBranch = {
    meta: {
        type: 'problem',
        docs: { description: 'A shared package does not branch on which app it runs in.' },
        schema: [],
        messages: {
            appKindBranch:
                'A shared package does not ask which app it is. Take what differs from the ' +
                'configuration the app passes in, or from a registry each app fills.',
        },
    },
    create(context) {
        if (!isSharedSource(context.filename)) {
            return {};
        }

        return {
            BinaryExpression(node) {
                const compares = ['===', '!==', '==', '!='].includes(node.operator);

                if (compares && (isAppKind(node.left) || isAppKind(node.right))) {
                    context.report({ node, messageId: 'appKindBranch' });
                }
            },
            SwitchCase(node) {
                if (node.test !== null && isAppKind(node.test)) {
                    context.report({ node, messageId: 'appKindBranch' });
                }
            },
        };
    },
};
