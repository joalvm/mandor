/**
 * A component file is read whole: what the piece of the screen draws, with what it is drawn — its
 * classes, its variants, its tables, its props — stays in it, because that is the reading of the
 * component. A hook or a function is different: the component uses it by its name, and the name
 * says what it gives; only to study how does one open it. Kept above the component, it is a second
 * idea the reader has to step over, that no test can name and no other component can reach. So a
 * hook goes to a file named after itself, and a function to one named after the datum it serves.
 *
 * Only a file named like a component is one: `GroupGrid.tsx`. A context module, a hook that
 * returns markup or a generated glyph is named after its subject and keeps its own shape.
 */

import { basename } from 'node:path';

const COMPONENT_FILE = /^[A-Z][A-Za-z0-9]*\.tsx$/;
const COMPONENT_NAME = /^[A-Z]/;
const HOOK_NAME = /^use[A-Z]/;
const FUNCTION_VALUES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

/** Per kind of top-level statement, the functions it declares that are no component. */
const FUNCTIONS = {
    FunctionDeclaration: (node) =>
        node.id === null || COMPONENT_NAME.test(node.id.name) ? [] : [node.id.name],
    VariableDeclaration: (node) =>
        node.declarations
            .filter(
                (each) =>
                    each.id.type === 'Identifier' &&
                    !COMPONENT_NAME.test(each.id.name) &&
                    FUNCTION_VALUES.has(each.init?.type),
            )
            .map((each) => each.id.name),
};

function functionsIn(node) {
    return FUNCTIONS[node.type]?.(node) ?? [];
}

/** @type {import('eslint').Rule.RuleModule} */
export const componentFileHoldsComponents = {
    meta: {
        type: 'suggestion',
        docs: {
            description:
                'A component file declares no hook and no function besides its components.',
        },
        schema: [],
        messages: {
            hook: '`{{name}}` is a hook declared in a component file: move it to `{{name}}.ts`.',
            function:
                '`{{name}}` is a function declared in a component file: move it to a file of ' +
                'its own beside the component, named for the datum it serves.',
        },
    },
    create(context) {
        if (!COMPONENT_FILE.test(basename(context.filename))) {
            return {};
        }

        function check(node, statement) {
            for (const name of functionsIn(statement)) {
                const messageId = HOOK_NAME.test(name) ? 'hook' : 'function';

                context.report({ node, messageId, data: { name } });
            }
        }

        return {
            'Program > *'(node) {
                const exported = node.type === 'ExportNamedDeclaration';

                check(node, exported ? (node.declaration ?? node) : node);
            },
        };
    },
};
