/**
 * The focus ring of the product replaces the border it lands on: same line, same thickness,
 * another colour. Two ways of drawing it are wrong and both come back on their own, so both are
 * checked here.
 *
 * `outline` puts the ring outside the box, where it overlaps the neighbour and breaks the four
 * pixel grid. The reset is the one place allowed to name the property, and only to switch it off.
 *
 * An inset shadow puts it inside, a pixel in from the border, and the control ends up wearing two
 * lines where the design has one. That is what the ring used to look like and what it must not
 * look like again.
 */

const OUTLINE = /\boutline(?:-[\w-]+)?\s*:/;
const INSET = /\binset\b/;
const RESET = 'packages/ui/src/styles/base.css';

/** Every rule of a stylesheet, as the selector that opens it and the body it declares. */
function rulesOf(text) {
    return text
        .split('}')
        .map((block) => block.split('{'))
        .filter((parts) => parts.length === 2)
        .map(([selector, body]) => ({ body, selector }));
}

function insetRingProblems(file) {
    return rulesOf(file.text)
        .filter((rule) => rule.selector.includes('focus') && INSET.test(rule.body))
        .map(
            () =>
                `${file.path}: draws the focus ring inside the box with an inset shadow. The ` +
                'ring replaces the border it lands on, so recolour the border instead.',
        );
}

function outlineProblemsOf(file) {
    if (file.path === RESET || !OUTLINE.test(file.text)) {
        return [];
    }

    return [
        `${file.path}: draws focus with \`outline\`. Mark the control with ` +
            '`data-focus-frame` and let `runtime.css` recolour its border.',
    ];
}

/** @param {readonly {path: string, text: string}[]} files */
export function focusRingProblems(files) {
    return files
        .filter((file) => file.path.endsWith('.css'))
        .flatMap((file) => [...outlineProblemsOf(file), ...insetRingProblems(file)]);
}
