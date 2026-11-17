/**
 * A hook lives in a file named exactly like it: `useVariableHover` in `useVariableHover.ts`. The
 * name is what a reader types to find it and what a test names to cover it, so a kebab-case
 * spelling of the same word is a second name for one thing. A file that exports several hooks is
 * named after one of them. A file whose exports are not all hooks is named after its subject —
 * a context module exports the provider and the hook that reads it — and is left alone.
 */

const HOOK_NAME = /^use[A-Z]/;

function baseNameOf(filename) {
    const last = filename.split(/[\\/]/).pop() ?? '';

    return last.replace(/\.[^.]+$/, '');
}

function exportedNames(declaration) {
    if (declaration === null || declaration === undefined) {
        return [];
    }

    if (declaration.type === 'FunctionDeclaration') {
        return declaration.id === null ? [] : [declaration.id.name];
    }

    if (declaration.type === 'VariableDeclaration') {
        return declaration.declarations
            .filter((each) => each.id.type === 'Identifier')
            .map((each) => each.id.name);
    }

    return [];
}

/** @type {import('eslint').Rule.RuleModule} */
export const hookFileName = {
    meta: {
        type: 'suggestion',
        docs: { description: 'A file that exports a hook is named after it.' },
        schema: [],
        messages: {
            hookFileName: 'This file exports `{{hook}}`: name it `{{hook}}` too.',
        },
    },
    create(context) {
        const values = [];

        return {
            ExportNamedDeclaration(node) {
                values.push(...exportedNames(node.declaration));
            },
            'Program:exit'(node) {
                const hooks = values.filter((name) => HOOK_NAME.test(name));
                const [first] = hooks;
                const hookFile = first !== undefined && hooks.length === values.length;

                if (hookFile && !hooks.includes(baseNameOf(context.filename))) {
                    context.report({ node, messageId: 'hookFileName', data: { hook: first } });
                }
            },
        };
    },
};
