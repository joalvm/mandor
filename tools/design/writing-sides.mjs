/**
 * The window runs from the right in a language written that way, and it turns round on its own
 * only where the layout names the start and the end of the line instead of the left and the
 * right. A margin, a padding, an edge, a border or an alignment written to a physical side stays
 * put when the text turns, so it is written to the logical one: `ms-`, `pe-`, `start-`,
 * `text-end`, `border-s` in a class; `margin-inline-start`, `inset-inline-end` in a stylesheet.
 *
 * Centring on the middle (`left-1/2` with its translation) is the same from either side, and
 * stays as it is.
 */

const CLASS_BOUNDARY = String.raw`(?:^|[\s"'\x60:])`;

const PHYSICAL_CLASS = new RegExp(
    CLASS_BOUNDARY +
        String.raw`-?(?:` +
        [
            String.raw`(?:scroll-)?[mp][lr]-[\w.[]`,
            String.raw`(?:left|right)-(?!1\/2)[\w.[]`,
            String.raw`text-(?:left|right)(?![\w-])`,
            String.raw`border-[lr](?:-\d)?(?![\w-])`,
            String.raw`rounded-(?:[lr]|[tb][lr])(?:-[\w]+)?(?![\w-])`,
        ].join('|') +
        ')',
    'm',
);

const PHYSICAL_PROPERTY = new RegExp(
    String.raw`^\s*(?:` +
        [
            String.raw`(?:margin|padding|border|scroll-margin|scroll-padding)-(?:left|right)(?:-[a-z]+)?`,
            'left|right',
            String.raw`border-(?:top|bottom)-(?:left|right)-radius`,
        ].join('|') +
        String.raw`)\s*:`,
    'm',
);

const PHYSICAL_ALIGNMENT = /^\s*(?:text-align|float|clear)\s*:\s*(?:left|right)\b/m;

const SAY_CLASS =
    'writes a class to the left or the right. Name the start or the end: ' +
    '`ms-`, `pe-`, `start-`, `text-end`, `border-s`.';

const SAY_PROPERTY =
    'lays something out to the left or the right. Write the logical property: ' +
    '`margin-inline-start`, `inset-inline-end`, `text-align: start`.';

/** @param {readonly {path: string, text: string}[]} files */
export function writingSideProblems(files) {
    const components = files
        .filter((file) => file.path.endsWith('.tsx') && PHYSICAL_CLASS.test(file.text))
        .map((file) => `${file.path}: ${SAY_CLASS}`);
    const sheets = files
        .filter((file) => file.path.endsWith('.css'))
        .filter((file) => PHYSICAL_PROPERTY.test(file.text) || PHYSICAL_ALIGNMENT.test(file.text))
        .map((file) => `${file.path}: ${SAY_PROPERTY}`);

    return [...components, ...sheets];
}
