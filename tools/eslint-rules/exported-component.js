/**
 * Where a piece of JSX belongs. Reading it off the tree is the same walk for every rule that has
 * something to say about components: climb from the JSX to the function that returns it, then
 * from the function to the binding the module exports, `memo` and `forwardRef` in between or not.
 */

const WRAPPERS = new Set(['forwardRef', 'memo']);
const FUNCTIONS = new Set(['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']);
const PASS_THROUGH = new Set(['ConditionalExpression', 'LogicalExpression']);

export function isWrapperCall(node) {
    return (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        WRAPPERS.has(node.callee.name)
    );
}

/** React prints `Anonymous` for these, so the name has to come from somewhere else. */
export function isAnonymousFunction(node) {
    return FUNCTIONS.has(node.type) && (node.id ?? null) === null;
}

function exportedName(node, id) {
    const exported = node.parent.type === 'ExportNamedDeclaration' && id !== null;

    if (!exported || id.type !== 'Identifier' || !/^[A-Z]/.test(id.name)) {
        return undefined;
    }

    return id.name;
}

/** Name of the exported component this function is, wrapped in `memo` or not. */
export function componentOf(fn) {
    if (fn.type === 'FunctionDeclaration') {
        return exportedName(fn, fn.id);
    }

    const holder = isWrapperCall(fn.parent) ? fn.parent.parent : fn.parent;

    if (holder.type !== 'VariableDeclarator') {
        return undefined;
    }

    return exportedName(holder.parent, holder.id);
}

function enclosingFunction(node) {
    for (let current = node.parent; current !== null; current = current.parent) {
        if (FUNCTIONS.has(current.type)) {
            return current;
        }
    }

    return undefined;
}

/** The function this JSX is the return value of, when it is returned at all. */
export function returningFunction(node) {
    let current = node;

    while (PASS_THROUGH.has(current.parent.type)) {
        current = current.parent;
    }

    if (current.parent.type === 'ArrowFunctionExpression') {
        return current.parent.body === current ? current.parent : undefined;
    }

    if (current.parent.type !== 'ReturnStatement') {
        return undefined;
    }

    return enclosingFunction(current.parent);
}
