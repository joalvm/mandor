import type { editor } from 'monaco-editor/editor/editor.api.js';

import type { WindowTheme } from '../window-theme.js';

type Role = 'comment' | 'constant' | 'escape' | 'heading' | 'link' | 'list' | 'quote' | 'tag';

type Rule = [token: string, role: Role | null, fontStyle?: string];

const GITHUB_DARK: Record<Role, string> = {
    comment: '8b949e',
    constant: '79c0ff',
    escape: 'ec8e2c',
    heading: '79c0ff',
    link: 'a5d6ff',
    list: 'fdac54',
    quote: 'a5d6ff',
    tag: 'a5d6ff',
};

const GITHUB_LIGHT: Record<Role, string> = {
    comment: '6e7781',
    constant: '0550ae',
    escape: 'b35900',
    heading: '0550ae',
    link: '0a3069',
    list: '8a4600',
    quote: '0550ae',
    tag: '0550ae',
};

/**
 * The colours of markdown in GitHub Light and Dark Colorblind (primer/github-vscode-theme 6.3.5,
 * MIT), with the values of `@primer/primitives` 7.10.0 resolved. Only the syntax: the background,
 * the text and the chrome of the editor stay Monaco's own. A high-contrast theme wears the
 * colours of its scheme, which read on the black and the white that Monaco draws it on.
 */
const GITHUB: Record<WindowTheme, Record<Role, string>> = {
    dark: GITHUB_DARK,
    'dark-contrast': GITHUB_DARK,
    light: GITHUB_LIGHT,
    'light-contrast': GITHUB_LIGHT,
};

/**
 * Each markdown scope of the GitHub theme, spelt as the token the markdown grammar emits. The
 * `.md` suffix keeps every other language out, the code of a fenced block included: every other
 * editor of the window reads exactly as Monaco draws it.
 */
const RULES: readonly Rule[] = [
    ['markup.heading.md', 'heading', 'bold'],
    ['meta.separator.md', 'heading', 'bold'],
    ['markup.quote.md', 'quote'],
    ['markup.list.md', 'list'],
    ['markup.bold.md', null, 'bold'],
    ['markup.italic.md', null, 'italic'],
    ['markup.strikethrough.md', null, 'strikethrough'],
    ['markup.inline.raw.md', 'constant'],
    ['markup.underline.link.md', null, 'underline'],
    ['string.other.link.md', 'link'],
    ['constant.other.reference.link.md', 'link'],
    ['constant.character.escape.md', 'escape'],
    ['entity.name.tag.md', 'tag'],
    ['comment.md', 'comment'],
];

/** The theme Monaco ships for each theme of the window, which the markdown colours sit on. */
const BASE: Record<WindowTheme, editor.BuiltinTheme> = {
    dark: 'vs-dark',
    'dark-contrast': 'hc-black',
    light: 'vs',
    'light-contrast': 'hc-light',
};

/** The theme Monaco ships for one theme of the window, with the colours of markdown on it. */
export function markdownTheme(theme: WindowTheme): editor.IStandaloneThemeData {
    const palette = GITHUB[theme];

    return {
        base: BASE[theme],
        colors: {},
        inherit: true,
        rules: RULES.map(([token, role, fontStyle]) => ({
            token,
            ...(role === null ? {} : { foreground: palette[role] }),
            ...(fontStyle === undefined ? {} : { fontStyle }),
        })),
    };
}
