/**
 * A native `<button>`, `<input>` or `<select>` arrives with the look of the operating system, its
 * own focus ring and a height nothing in the scale agrees with, so one screen of the app stops
 * matching the rest. The primitives of `@mandor/ui` are the only place allowed to hold one, and
 * they are what everything else composes with.
 *
 * It is the contract as much as the look. The day the library underneath changes, what has to be
 * rewritten is `packages/ui/src` and nothing else; a control opened by hand anywhere else is a
 * second implementation of a primitive that already exists, and it drifts on its own.
 *
 * A test builds components that never reach a screen, so it may open a control by hand to stand
 * in for one.
 */

const NATIVE_CONTROLS = new Set(['button', 'input', 'option', 'select', 'textarea']);

function ownsControls(filename) {
    return (
        /(?:^|[\\/])packages[\\/]ui[\\/]src[\\/]/.test(filename) ||
        /(?:^|[\\/])tests?[\\/]|[.](?:spec|test)[.]tsx$/.test(filename)
    );
}

/** @type {import('eslint').Rule.RuleModule} */
export const noNativeControl = {
    meta: {
        type: 'problem',
        docs: { description: 'Native form controls live only inside the primitives.' },
        schema: [],
        messages: {
            nativeControl:
                'Compose `{{name}}` from the primitives of @mandor/ui: a native control brings ' +
                'the look of the system, not the one of the app.',
        },
    },
    create(context) {
        if (ownsControls(context.filename)) {
            return {};
        }

        return {
            JSXOpeningElement(node) {
                const isNative =
                    node.name.type === 'JSXIdentifier' && NATIVE_CONTROLS.has(node.name.name);

                if (isNative) {
                    context.report({
                        node,
                        messageId: 'nativeControl',
                        data: { name: node.name.name },
                    });
                }
            },
        };
    },
};
