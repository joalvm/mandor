/**
 * A modal stops the rest of the window, so it needs a local reason that survives the code around
 * it changing. The policy has four reasons: a system dialog, an irreversible confirmation, a
 * security decision that must happen before the work may continue, or a short configuration form
 * — creating or editing an environment, a connection, a setting — with nothing else to look at.
 */

const DIALOGS = new Set(['ConfirmDialog', 'Dialog', 'SaveChangesDialog']);
const REASONS = [
    'system-dialog',
    'irreversible-confirmation',
    'security-decision',
    'short-config-form',
].join('|');
const POLICY = new RegExp(String.raw`\bmodal-policy:\s*(?:${REASONS})\b`, 'u');

function isTest(filename) {
    return /(?:^|[\\/])tests?[\\/]|\.(?:spec|test)\.[jt]sx?$/.test(filename);
}

function hasPolicyComment(sourceCode, node) {
    return sourceCode
        .getAllComments()
        .some(
            (comment) =>
                comment.loc.end.line === node.loc.start.line - 1 && POLICY.test(comment.value),
        );
}

/** @type {import('eslint').Rule.RuleModule} */
export const dialogNeedsPolicy = {
    meta: {
        type: 'problem',
        docs: {
            description: 'A modal names its system, irreversible, security or short-form reason.',
        },
        schema: [],
        messages: {
            missingPolicy:
                'Put `// modal-policy: system-dialog`, `// modal-policy: irreversible-confirmation`, ' +
                '`// modal-policy: security-decision` or `// modal-policy: short-config-form` ' +
                'immediately above this modal.',
        },
    },
    create(context) {
        if (isTest(context.filename)) {
            return {};
        }

        const dialogs = new Set();
        const sourceCode = context.sourceCode;

        return {
            ImportDeclaration(node) {
                if (node.source.value !== '@mandor/ui') {
                    return;
                }

                for (const specifier of node.specifiers) {
                    const isDialog =
                        specifier.type === 'ImportSpecifier' &&
                        DIALOGS.has(specifier.imported.name);

                    if (isDialog) {
                        dialogs.add(specifier.local.name);
                    }
                }
            },
            JSXOpeningElement(node) {
                const isDialog = node.name.type === 'JSXIdentifier' && dialogs.has(node.name.name);

                if (isDialog && !hasPolicyComment(sourceCode, node)) {
                    context.report({ node, messageId: 'missingPolicy' });
                }
            },
        };
    },
};
