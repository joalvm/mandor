/**
 * A band is a row of the window that carries chrome: a title row, a toolbar, a strip of tabs, a
 * section header, a footer of a dialog. Every one of them is the same shape, and the shape is
 * what a reader notices before any colour: one named height, its contents centred across it, and
 * the same inset at both ends so the columns of the window line up down the screen.
 *
 * The three ways a band goes wrong are all silent. A row with no cross-axis alignment leaves a
 * control of fixed height stuck against the top edge. A height written as a number is a measure
 * invented for one row, so no two rows of the product agree. A band with no inset of its own
 * puts its first word against the edge of the window and out of line with the row above it.
 *
 * None of the three shows up as an error, a warning, or a failing test: they show up as an
 * interface that looks like nobody laid it out. That is what is checked here.
 */

import { openingTags } from './jsx-tags.mjs';

/** The named heights of the scale. A band is as tall as one of these and never a number. */
const HEIGHTS = new Set([
    'h-tab',
    'h-row-xs',
    'h-control-xs',
    'h-control-sm',
    'h-field',
    'h-row',
    'h-control',
    'h-crumb',
    'h-section',
    'h-header',
    'h-address',
    'h-toolbar',
    'h-titlebar',
    'h-statusbar',
]);

/** Heights that defer to the parent instead of naming one. A band may take either. */
const INHERITED = new Set(['h-auto', 'h-full', 'h-screen']);

const ANY_HEIGHT = /^h-/;
const ALIGNMENT = /^items-/;
const INSET = /^p[xlr]?-pad-/;

/** The one way out, and it costs a sentence: `// band-policy: <why>` above the tag. */
const EXEMPT = /band-policy:\s*\S/;

/** Where the value of `className` starts on this tag, or -1 when the tag sets none. */
function classesFrom(text) {
    const at = text.indexOf('className=');

    if (at === -1) {
        return [];
    }

    const value = text.slice(at + 'className='.length);
    const quoted = value.matchAll(/'([^']*)'|"([^"]*)"/g);

    return [...quoted]
        .flatMap((match) => (match[1] ?? match[2]).split(/\s+/))
        .filter((name) => name !== '');
}

/**
 * A row of chrome: laid out in a line, across the screen. A column is not a band — what stacks
 * has its own rhythm — and neither is a chip, which sits inside a line rather than being one.
 */
function isBand(classes) {
    return classes.includes('flex') && !classes.includes('flex-col');
}

const RULES = [
    {
        broken: (classes) => !classes.some((name) => ALIGNMENT.test(name)),
        say:
            'is a band that never says where its contents sit across it. Add `items-center`, ' +
            'or state the alignment it does want.',
    },
    {
        broken: (classes) =>
            classes.some((name) => ANY_HEIGHT.test(name)) &&
            !classes.some((name) => HEIGHTS.has(name) || INHERITED.has(name)),
        say:
            'measures a band in numbers. A band is as tall as the tallest control it holds plus ' +
            'the air around it, and that height has a name in `scales.css`.',
    },
    {
        broken: (classes) =>
            classes.some((name) => HEIGHTS.has(name)) && !classes.some((name) => INSET.test(name)),
        say:
            'is a band with no inset of its own, so it opens against the edge and out of line ' +
            'with the band above it. Reach for `px-pad-panel` or `px-pad-control`.',
    },
    {
        broken: (classes) => classes.filter((name) => HEIGHTS.has(name)).length > 1,
        say: 'gives a band two heights. Only one of them can win, and which is a guess.',
    },
];

/** @param {readonly {path: string, text: string}[]} files */
export function bandGeometryProblems(files) {
    const components = files.filter((file) => file.path.endsWith('.tsx'));

    return components.flatMap((file) =>
        openingTags(file.text)
            .filter((tag) => !EXEMPT.test(tag.before))
            .map((tag) => classesFrom(tag.text))
            .filter(isBand)
            .flatMap((classes) =>
                RULES.filter((rule) => rule.broken(classes)).map(
                    (rule) => `${file.path}: ${rule.say}`,
                ),
            ),
    );
}
