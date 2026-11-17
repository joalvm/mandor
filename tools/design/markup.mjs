/**
 * The anatomy of a component, in the part a machine can read. A component becomes HTML, and the
 * HTML is the product: what a screen reader announces, what a keyboard can reach and what the
 * next person has to hold in their head are all decided by which boxes exist and what each one
 * is called. The judgement stays in the `ui-design` skill; these are the six mistakes that
 * need no judgement at all.
 */

import { openingTags } from './jsx-tags.mjs';

/**
 * The zones of the window are primitives of `@mandor/ui`, and that folder is the only place a
 * landmark is drawn. Each app writes its own window by putting those zones in a tree; a panel
 * that reached for a landmark of its own would be claiming a place the window already gave out.
 */
const ZONES = /(?:^|[\\/])packages[\\/]ui[\\/]src[\\/]components[\\/]layout[\\/]/;

const WINDOW_LANDMARKS = new Set(['main', 'nav', 'aside']);
const NAMED = /aria-label(?:ledby)?=/;
const HANDLER = /\son(?:Click|KeyDown|KeyUp|MouseDown)=/;

/** The one way out, and it costs a sentence: `// markup-policy: <why>` above the tag. */
const EXEMPT = /markup-policy:\s*\S/;

const RULES = [
    {
        broken: (tag, path) => WINDOW_LANDMARKS.has(tag.name) && !ZONES.test(path),
        say: (tag) =>
            `draws a \`<${tag.name}>\` of its own. A window has one, and the zones of ` +
            '`@mandor/ui` own it. Inside a panel, name a `<section>` or reach for a `<div>`.',
    },
    {
        broken: (tag) => tag.name === 'section' && !NAMED.test(tag.text),
        say: () =>
            'has a `<section>` with no accessible name, which is a `<div>` in costume. Give it ' +
            '`aria-labelledby` pointing at its heading, or make it a `<div>`.',
    },
    {
        broken: (tag) => /^<div\s*\/?>$/.test(tag.text),
        say: () => 'has a `<div>` with nothing on it. A box with no job is one box too many.',
    },
    {
        broken: (tag) =>
            (tag.name === 'div' || tag.name === 'span') &&
            HANDLER.test(tag.text) &&
            !/\srole=/.test(tag.text),
        say: (tag) =>
            `answers input on a \`<${tag.name}>\` with no role. What takes a click is a ` +
            '`<button>`, and what takes a key says what it is.',
    },
    {
        broken: (tag) => /role="button"/.test(tag.text),
        say: () => 'wears `role="button"`. Use `IconButton` or a `<button>`; the role is a patch.',
    },
    {
        broken: (tag) => /aria-label="[^"]+"/.test(tag.text),
        say: () => 'writes an `aria-label` by hand. A label is interface text and comes from i18n.',
    },
];

/** @param {readonly {path: string, text: string}[]} files */
export function markupProblems(files) {
    const components = files.filter((file) => file.path.endsWith('.tsx'));

    return components.flatMap((file) =>
        openingTags(file.text)
            .filter((tag) => !EXEMPT.test(tag.before))
            .flatMap((tag) =>
                RULES.filter((rule) => rule.broken(tag, file.path)).map(
                    (rule) => `${file.path}: ${rule.say(tag)}`,
                ),
            ),
    );
}
