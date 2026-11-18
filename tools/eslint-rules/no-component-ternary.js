/**
 * A component that draws one thing or another by a ternary hides the condition inside the
 * markup: the reader has to stop at the `?`, hold both branches in mind and find where each one
 * ends. The condition reads better as a component of its own, named for what it shows, that
 * answers `null` when there is nothing to show:
 *
 *     <DocLanguage language={language} />
 *
 *     function DocLanguage({ language }: { language: string | undefined }) {
 *         if (language === undefined) {
 *             return null;
 *         }
 *
 *         return <span data-part="doc-code-language">{language}</span>;
 *     }
 *
 * Such a satellite lives in the file of the component it serves and is not exported. `&&`, `||`
 * and `??` in front of an element are the same ternary with one branch left out, and go the same
 * way. A ternary over text or values stays: the rule only looks at a branch that is an element.
 */

const ELEMENTS = new Set(['JSXElement', 'JSXFragment']);

function isElement(node) {
    return ELEMENTS.has(node.type);
}

/** @type {import('eslint').Rule.RuleModule} */
export const noComponentTernary = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'A component draws a conditional piece through a component of its own.',
        },
        schema: [],
        messages: {
            ternary:
                'A condition does not choose what a component draws inline. Move it into a ' +
                'component of this file, named for what it shows, that returns `null` when there ' +
                'is nothing to show.',
        },
    },
    create(context) {
        return {
            ConditionalExpression(node) {
                if (isElement(node.consequent) || isElement(node.alternate)) {
                    context.report({ node, messageId: 'ternary' });
                }
            },
            LogicalExpression(node) {
                if (isElement(node.left) || isElement(node.right)) {
                    context.report({ node, messageId: 'ternary' });
                }
            },
        };
    },
};
