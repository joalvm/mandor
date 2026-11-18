import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Markdown } from '../../../src/components/markdown/Markdown.js';
import { setTextZoom } from '../../../src/lib/text-zoom.js';

afterEach(() => {
    // The window goes first: a step put back under a mounted page is an update outside act.
    cleanup();
    setTextZoom(0);
});

describe('markdown', () => {
    it('draws the tables and task lists of GFM', () => {
        const table = ['| Campo | Tipo |', '| --- | --- |', '| puerto | número |'].join('\n');

        render(<Markdown value={`${table}\n\n- [x] hecho\n`} />);

        expect(screen.getByRole('table')).toBeVisible();
        expect(screen.getByRole('columnheader', { name: 'Campo' })).toBeVisible();
        expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('does not mount raw HTML that the text carries', () => {
        const { container } = render(
            <Markdown value={'Antes <script>alert(1)</script> <b>negrita</b> después'} />,
        );

        expect(container.querySelector('script')).toBeNull();
        expect(container.querySelector('b')).toBeNull();
    });

    it('does not let a javascript: address reach an href', () => {
        render(<Markdown value="[pulsa](javascript:alert(1))" />);

        expect(screen.getByText('pulsa').closest('a')?.getAttribute('href') ?? '').not.toMatch(
            /^javascript:/i,
        );
    });

    it('filters with the schema it is handed instead of the default one', () => {
        const only = { tagNames: ['p'] };

        render(<Markdown sanitize={only} value={'# Título\n\nCuerpo'} />);

        expect(screen.queryByRole('heading')).toBeNull();
        expect(screen.getByText('Cuerpo')).toBeVisible();
    });

    it('colours a fence only when asked to, and in the language it names', () => {
        const fence = ['```ts', 'const port = 8080;', '```'].join('\n');
        const { container, rerender } = render(<Markdown value={fence} />);

        expect(container.querySelectorAll('.hljs-keyword')).toHaveLength(0);

        rerender(<Markdown highlight value={fence} />);

        expect(container.querySelectorAll('.hljs-keyword')).toHaveLength(1);
    });

    it('hands the elements to the components it was given', () => {
        render(
            <Markdown components={{ a: () => <em>enlace propio</em> }} value="[x](https://a.b)" />,
        );

        expect(screen.getByText('enlace propio')).toBeVisible();
    });

    it('marks its root so the stylesheet of the prose can find it', () => {
        const { container } = render(<Markdown value="texto" />);

        expect(container.firstElementChild).toHaveAttribute('data-part', 'markdown');
    });

    /** The stylesheet scales the whole page by the step its root carries: text, air and pictures. */
    it('carries the step the reader put the text of the window at, and follows it', () => {
        const { container } = render(<Markdown value="texto" />);

        expect(container.firstElementChild).toHaveAttribute('data-text-zoom', '0');

        act(() => {
            setTextZoom(4);
        });

        expect(container.firstElementChild).toHaveAttribute('data-text-zoom', '4');
    });
});
