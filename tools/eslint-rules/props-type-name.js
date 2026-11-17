/**
 * The props of a component are the component's, so they carry its name. A file whose type is
 * called `Props` reads fine alone and stops reading the moment it is quoted anywhere else: an
 * error message, a search across the repo, a second type moving in beside it. `DialogProps` says
 * whose contract it is from wherever it is seen.
 *
 * A component that fills a contract somebody else owns — a panel of the grid library — takes
 * that contract's type and keeps its name. The rule only looks at the alias declared in the same
 * file, which is the one this file gets to name.
 */

import { componentOf, isWrapperCall } from './exported-component.js';

/** The type a component reads its props from: its first parameter, or what wraps it. */
function propsTypeNode(fn) {
    const wrapper = isWrapperCall(fn.parent) ? fn.parent : undefined;
    const args = (wrapper?.typeArguments ?? wrapper?.typeParameters)?.params;

    if (args !== undefined && args.length === 2) {
        return args[1];
    }

    return fn.params[0]?.typeAnnotation?.typeAnnotation;
}

function aliasNames(program) {
    const declared = program.body.map((node) =>
        node.type === 'ExportNamedDeclaration' ? node.declaration : node,
    );

    return new Set(
        declared
            .filter((node) => node?.type === 'TSTypeAliasDeclaration')
            .map((node) => node.id.name),
    );
}

/** @type {import('eslint').Rule.RuleModule} */
export const propsTypeName = {
    meta: {
        type: 'problem',
        docs: { description: 'The props of a component are named after the component.' },
        schema: [],
        messages: {
            unnamed:
                'The props of `{{component}}` are written into the signature. Declare them as ' +
                '`{{expected}}`, so the contract has a name to be quoted by.',
            mismatch:
                '`{{actual}}` is declared here and belongs to `{{component}}`. Name it ' +
                '`{{expected}}`, or import the contract it really fills.',
        },
    },
    create(context) {
        let local = new Set();

        function check(fn) {
            const component = componentOf(fn);
            const props = component === undefined ? undefined : propsTypeNode(fn);
            const expected = `${String(component)}Props`;

            if (props?.type === 'TSTypeLiteral') {
                context.report({
                    node: props,
                    messageId: 'unnamed',
                    data: { component, expected },
                });

                return;
            }

            const actual = props?.type === 'TSTypeReference' ? props.typeName : undefined;

            if (actual?.type !== 'Identifier' || !local.has(actual.name)) {
                return;
            }

            if (actual.name !== expected) {
                const data = { actual: actual.name, component, expected };

                context.report({ node: props, messageId: 'mismatch', data });
            }
        }

        return {
            Program(node) {
                local = aliasNames(node);
            },
            ':function': check,
        };
    },
};
