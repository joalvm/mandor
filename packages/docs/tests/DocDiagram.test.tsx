import { byPart } from '@mandor/ui/testing';
import { preloadMarkdownRuntime } from '@mandor/ui/testing/markdown-runtime';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

// Mermaid lays a diagram out by measuring its words in the page, and jsdom measures nothing:
// the library stands in for itself here with the SVG it would hand back.
const mermaid = vi.hoisted(() => ({
    initialize: vi.fn(),
    parse: vi.fn<(source: string) => Promise<unknown>>(),
    render: vi.fn<() => Promise<{ svg: string }>>(),
}));

vi.mock('mermaid/dist/mermaid.esm.min.mjs', () => ({ default: mermaid }));

const SOURCE = 'graph TD\n  A --> B';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120"><g/></svg>';
const writeText = vi.fn<(text: string) => Promise<void>>();

function fence(source: string): string {
    return `\`\`\`mermaid\n${source}\n\`\`\`\n`;
}

function show(source = SOURCE) {
    const shown = render(<DocView value={fence(source)} />, { wrapper: AppProviders });

    return {
        again: (next: string) => {
            shown.rerender(<DocView value={fence(next)} />);
        },
        figure: () => byPart('doc-diagram', shown.container),
    };
}

function press(name: string): void {
    fireEvent.click(screen.getByRole('button', { name }));
}

// The file runs alone, without the renderer of markdown the shared workers load up front: the
// first test reads the drawing being started, so the doc has to be there in the first render.
beforeAll(preloadMarkdownRuntime);

beforeEach(() => {
    mermaid.parse.mockReset().mockResolvedValue({});
    mermaid.render.mockReset().mockResolvedValue({ svg: SVG });
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
    // The window goes first: a theme put back under a mounted tree is an update outside act.
    cleanup();
    Reflect.deleteProperty(navigator, 'clipboard');
    document.documentElement.removeAttribute('data-theme');
});

/** The block of a doc that is drawn (DocDiagram, by useDiagram, with DocDiagramActions and DocDiagramBody). */
describe('a mermaid block of a doc', () => {
    it('says it is drawing, and then shows the drawing at its own size', async () => {
        show();

        expect(screen.getByText('Drawing the diagram…')).toBeVisible();

        const picture = await screen.findByRole('img', { name: 'Diagram' });

        expect(picture).toHaveAttribute('width', '240');
        expect(picture).toHaveAttribute('height', '120');
        expect(screen.queryByText('Drawing the diagram…')).toBeNull();
    });

    it('shows the source it was drawn from instead, and copies it', async () => {
        show();
        await screen.findByRole('img', { name: 'Diagram' });

        press('Show code');

        expect(screen.queryByRole('img', { name: 'Diagram' })).toBeNull();
        expect(byPart('doc-diagram-source', document.body)).toHaveTextContent('A --> B');

        press('Copy the code of the diagram');

        expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible();
        expect(writeText).toHaveBeenCalledWith(SOURCE);

        press('Show diagram');

        expect(screen.getByRole('img', { name: 'Diagram' })).toBeVisible();
    });

    /** The steps stop at both ends, and the fit button is the way back from either of them. */
    it('grows and shrinks in steps, and fits the page again in one press', () => {
        const { figure } = show();

        expect(figure()).toHaveAttribute('data-zoom', '1');

        press('Zoom in');
        press('Zoom in');
        press('Zoom in');

        expect(figure()).toHaveAttribute('data-zoom', '3');
        expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();

        press('Fit to width');

        expect(figure()).toHaveAttribute('data-zoom', '1');

        press('Zoom out');
        press('Zoom out');

        expect(figure()).toHaveAttribute('data-zoom', '0.5');
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    });

    /** Only the first line of what the parser says is for the reader; the rest is for itself. */
    it('says why a diagram did not come out, in the first line of the error', async () => {
        mermaid.parse.mockRejectedValue(new Error('Parse error on line 2:\n...A -->\n-----^'));
        show();

        expect(
            await screen.findByText('The diagram could not be drawn: Parse error on line 2:'),
        ).toBeVisible();
        expect(screen.queryByRole('img', { name: 'Diagram' })).toBeNull();
        expect(screen.queryByText('Drawing the diagram…')).toBeNull();
    });

    /** A diagram half written is the normal state of one being written: it must not flicker. */
    it('keeps the last drawing that came out while the source has an error', async () => {
        const { again } = show();

        await screen.findByRole('img', { name: 'Diagram' });
        mermaid.parse.mockRejectedValue(new Error('Parse error on line 2:'));
        again('graph TD\n  A -->');

        expect(
            await screen.findByText(
                'The diagram has an error; the last good version is shown: Parse error on line 2:',
            ),
        ).toBeVisible();
        expect(screen.getByRole('img', { name: 'Diagram' })).toBeVisible();
    });

    /** The colours of the picture are the page's: a new theme is a new picture. */
    it('is drawn again when the window changes theme', async () => {
        document.documentElement.dataset['theme'] = 'light';
        show();
        await screen.findByRole('img', { name: 'Diagram' });

        mermaid.render.mockResolvedValue({
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 90"><g/></svg>',
        });

        // The window tells of the switch on a turn of its own, so the new picture is waited for.
        document.documentElement.dataset['theme'] = 'dark';

        await waitFor(() => {
            expect(screen.getByRole('img', { name: 'Diagram' })).toHaveAttribute('width', '300');
        });
    });
});
