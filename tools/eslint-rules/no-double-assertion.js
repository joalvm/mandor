/**
 * An assertion through another (`value as unknown as Type`) tells the compiler to stop checking
 * instead of telling it what the value is. When a dependency changes a type, the cast hides what
 * changed. The value gets the type it really has: a parameter narrowed to what the code reads, a
 * real instance of the class, or a guard that checks the value at run time.
 */

const ASSERTIONS = new Set(['TSAsExpression', 'TSTypeAssertion']);

/** @type {import('eslint').Rule.RuleModule} */
export const noDoubleAssertion = {
    meta: {
        type: 'problem',
        docs: { description: 'A value is not asserted through a second type.' },
        schema: [],
        messages: {
            double:
                'An assertion through another type silences the compiler. Narrow the type to ' +
                'what the code reads, build a real instance, or check the value with a guard.',
        },
    },
    create(context) {
        function check(node) {
            if (ASSERTIONS.has(node.expression.type)) {
                context.report({ node, messageId: 'double' });
            }
        }

        return { TSAsExpression: check, TSTypeAssertion: check };
    },
};
