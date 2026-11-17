/**
 * An error class is a contract on its own: callers catch it by name and read its
 * fields. When it shares a file with the code that throws it, the reader who came
 * looking for the catch has to scroll past everything else to find the shape.
 *
 * Cohesion cannot be linted, but this corner of it can: a file that exports an
 * error plus anything else is holding two ideas, always.
 */

/** @type {import('eslint').Rule.RuleModule} */
export const oneErrorPerFile = {
    meta: {
        type: 'problem',
        docs: { description: 'An exported error class is the only export of its file.' },
        schema: [],
        messages: {
            shared: 'Error "{{name}}" shares its file with "{{other}}". Give it its own file.',
        },
    },
    create(context) {
        const symbols = [];

        return {
            'Program > ExportNamedDeclaration'(node) {
                symbols.push(...exportedSymbols(node.declaration));
            },
            'Program:exit'() {
                reportSharedErrors(context, symbols);
            },
        };
    },
};

function exportedSymbols(declaration) {
    if (declaration === null || declaration === undefined) {
        return [];
    }

    if (declaration.type === 'VariableDeclaration') {
        return variableSymbols(declaration);
    }

    if (declaration.id === null || declaration.id === undefined) {
        return [];
    }

    return [{ name: declaration.id.name, isError: isErrorClass(declaration), node: declaration }];
}

function variableSymbols(declaration) {
    return declaration.declarations
        .filter((entry) => entry.id.type === 'Identifier')
        .map((entry) => ({ name: entry.id.name, isError: false, node: entry }));
}

/** Covers `extends Error` and `extends SomeDomainError`: both are catchable contracts. */
function isErrorClass(declaration) {
    if (declaration.type !== 'ClassDeclaration') {
        return false;
    }

    const parent = declaration.superClass;

    if (parent === null || parent === undefined || parent.type !== 'Identifier') {
        return false;
    }

    return parent.name.endsWith('Error');
}

function reportSharedErrors(context, symbols) {
    if (symbols.length < 2) {
        return;
    }

    for (const symbol of symbols.filter((entry) => entry.isError)) {
        const other = symbols.find((entry) => entry.name !== symbol.name);

        context.report({
            node: symbol.node,
            messageId: 'shared',
            data: { name: symbol.name, other: other.name },
        });
    }
}
