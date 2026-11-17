import { describe, expect, it } from 'vitest';

import { markdownTheme } from '../../../src/editor/monaco/markdown-theme.js';
import type { WindowTheme } from '../../../src/editor/window-theme.js';

describe('the colours of markdown in the editor', () => {
    it('sits on the theme Monaco ships for each theme of the window', () => {
        expect(markdownTheme('light')).toMatchObject({ base: 'vs', colors: {}, inherit: true });
        expect(markdownTheme('dark')).toMatchObject({ base: 'vs-dark', colors: {}, inherit: true });
        expect(markdownTheme('light-contrast')).toMatchObject({ base: 'hc-light' });
        expect(markdownTheme('dark-contrast')).toMatchObject({ base: 'hc-black' });
    });

    /** One theme holds every editor of the window: a rule without `.md` would reach them all. */
    it('colours the tokens of markdown and no other', () => {
        const tokens = markdownTheme('dark').rules.map((rule) => rule.token);

        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens.every((token) => token.endsWith('.md'))).toBe(true);
    });

    it('paints a heading in the blue of GitHub, bold, in each theme', () => {
        const heading = (theme: WindowTheme) =>
            markdownTheme(theme).rules.find((rule) => rule.token === 'markup.heading.md');

        expect(heading('light')).toEqual({
            fontStyle: 'bold',
            foreground: '0550ae',
            token: 'markup.heading.md',
        });
        expect(heading('dark')?.foreground).toBe('79c0ff');
        expect(heading('dark-contrast')?.foreground).toBe('79c0ff');
        expect(heading('light-contrast')?.foreground).toBe('0550ae');
    });

    it('leaves the colour of emphasis to the text and only changes its style', () => {
        const bold = markdownTheme('light').rules.find((rule) => rule.token === 'markup.bold.md');

        expect(bold).toEqual({ fontStyle: 'bold', token: 'markup.bold.md' });
    });
});
