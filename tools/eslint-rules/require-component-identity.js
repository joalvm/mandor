/**
 * A `div` in the inspector says nothing about which component put it there, and React DevTools
 * draws a tree nobody can cross with the DOM in front of them. One attribute answers both:
 * `data-part` on the root of every component, in kebab-case, never carrying data of the user.
 *
 * When the root is another component there is no node of ours to mark: `<TooltipPrimitive.Root>`
 * and `<I18nextProvider>` draw nothing. Passing `data-part` down is the better shape when the
 * child forwards it, but it is not demanded, because a named function is already identifiable in
 * DevTools and demanding `displayName` there would be the noise this rule exists to avoid.
 *
 * What is demanded is the case React cannot resolve: an anonymous function inside `memo` or
 * `forwardRef`, printed as `Anonymous`. A named function never needs it — React reads the name
 * from inside.
 *
 * Exempt: the glyphs of `packages/icons`, where the file name already identifies the `svg`, and
 * tests, which build components that never reach a screen.
 */

import {
    componentOf,
    isAnonymousFunction,
    isWrapperCall,
    returningFunction,
} from './exported-component.js';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isExempt(filename) {
    return (
        !filename.endsWith('.tsx') ||
        /(?:^|[\\/])packages[\\/]icons[\\/]src[\\/]/.test(filename) ||
        /(?:^|[\\/])tests?[\\/]|\.(?:spec|test)\.tsx$/.test(filename)
    );
}

function kebabOf(name) {
    return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function partAttributeOf(node) {
    return node.openingElement.attributes.find(
        (attribute) => attribute.type === 'JSXAttribute' && attribute.name.name === 'data-part',
    );
}

function isDomRoot(node) {
    return (
        node.openingElement.name.type === 'JSXIdentifier' &&
        /^[a-z]/.test(node.openingElement.name.name)
    );
}

function isKebabLiteral(attribute) {
    const value = attribute.value;

    return value !== null && value.type === 'Literal' && KEBAB_CASE.test(String(value.value));
}

function checkRoot(context, root, name) {
    const attribute = partAttributeOf(root);
    const data = { name, suggestion: kebabOf(name) };

    if (attribute === undefined) {
        context.report({ node: root, messageId: 'missingPart', data });

        return;
    }

    if (!isKebabLiteral(attribute)) {
        context.report({ node: attribute, messageId: 'notKebab', data });
    }
}

/** @type {import('eslint').Rule.RuleModule} */
export const requireComponentIdentity = {
    meta: {
        type: 'problem',
        docs: { description: 'Every component is identifiable in the DOM and in React DevTools.' },
        schema: [],
        messages: {
            missingPart:
                'Mark the root of `{{name}}` with data-part="{{suggestion}}": a node without it ' +
                'cannot be told apart in the inspector.',
            notKebab:
                'data-part takes a kebab-case literal, never an expression nor data of the user: ' +
                'write data-part="{{suggestion}}".',
            missingDisplayName:
                'React names an anonymous function `Anonymous`: write ' +
                '`memo(function {{name}}() {})` or declare `{{name}}.displayName`.',
        },
    },
    create(context) {
        if (isExempt(context.filename)) {
            return {};
        }

        const named = new Set();
        const anonymous = [];

        return {
            AssignmentExpression(node) {
                const target = node.left;
                const isDisplayName =
                    target.type === 'MemberExpression' &&
                    target.object.type === 'Identifier' &&
                    target.property.name === 'displayName';

                if (isDisplayName) {
                    named.add(target.object.name);
                }
            },
            CallExpression(node) {
                const inner = isWrapperCall(node) ? node.arguments[0] : undefined;

                if (inner === undefined || !isAnonymousFunction(inner)) {
                    return;
                }

                const name = componentOf(inner);

                if (name !== undefined) {
                    anonymous.push({ node, name });
                }
            },
            JSXElement(node) {
                if (!isDomRoot(node)) {
                    return;
                }

                const fn = returningFunction(node);
                const name = fn === undefined ? undefined : componentOf(fn);

                if (name !== undefined) {
                    checkRoot(context, node, name);
                }
            },
            'Program:exit'() {
                const missing = anonymous.filter((entry) => !named.has(entry.name));

                for (const entry of missing) {
                    context.report({
                        node: entry.node,
                        messageId: 'missingDisplayName',
                        data: { name: entry.name },
                    });
                }
            },
        };
    },
};
