/**
 * Every measure of the interface comes from a token. A `style` attribute or an arbitrary Tailwind
 * value skips the scale, so the same idea ends up with two spellings and the theme stops reaching
 * one of them. What a token cannot express belongs in the stylesheet of the primitive.
 */

const RULES = [
    {
        broken: /\sstyle=/,
        say: 'sets `style` inline. Reach for a token utility.',
    },
    {
        broken: /[\w-]+-\[[^\]]+\]/,
        say:
            'uses an arbitrary Tailwind value. Add the step to the scale in `scales.css` ' +
            'and name it.',
    },
    {
        // A gap says what it separates, and the five that exist cover every distance in this
        // interface: `tight`, `icon-text`, `control`, `group`, `section`. A number says how far
        // apart two things are and nothing about why, so it cannot be changed everywhere at once.
        broken: /\bgap(?:-x|-y)?-[0-9]/,
        say: 'measures a gap in numbers. Name what it separates: `gap-gap-control` and the rest.',
    },
];

/** @param {readonly {path: string, text: string}[]} files */
export function inlineValueProblems(files) {
    const components = files.filter((file) => file.path.endsWith('.tsx'));

    return RULES.flatMap((rule) =>
        components
            .filter((file) => rule.broken.test(file.text))
            .map((file) => `${file.path}: ${rule.say}`),
    );
}
