import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { drawDiagram } from '../src/lib/draw-diagram.js';

// Mermaid lays a diagram out by measuring its words in the page, and jsdom measures nothing:
// the library stands in for itself here with the SVG it would hand back.
const mermaid = vi.hoisted(() => ({
    initialize: vi.fn<(config: { themeVariables?: Record<string, string> }) => void>(),
    parse: vi.fn<(source: string) => Promise<unknown>>(),
    render: vi.fn<(id: string, source: string, stage: Element) => Promise<{ svg: string }>>(),
}));

vi.mock('mermaid/dist/mermaid.esm.min.mjs', () => ({ default: mermaid }));

const SOURCE = 'graph TD\n  A --> B';
const SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120.4 80" style="max-width: 120px"><g/></svg>';

function stage(): HTMLElement {
    const box = document.createElement('div');

    box.append(document.createElement('svg'));

    return box;
}

beforeEach(() => {
    mermaid.initialize.mockReset();
    mermaid.parse.mockReset().mockResolvedValue({});
    mermaid.render.mockReset().mockResolvedValue({ svg: SVG });
});

afterEach(() => {
    document.documentElement.style.removeProperty('--markdown-fg');
});

describe('drawing a diagram of a doc', () => {
    it('hands the drawing out as a picture, at the size it was drawn', async () => {
        const drawing = await drawDiagram(SOURCE, stage());

        expect(drawing).toMatchObject({ height: 80, kind: 'drawn', width: 120.4 });

        const src = drawing.kind === 'drawn' ? decodeURIComponent(drawing.src) : '';

        expect(src.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
        expect(src).toContain('width="121"');
        expect(src).toContain('height="80"');
        expect(src).not.toContain('max-width');
    });

    /** A diagram is a picture: nothing in it runs, and nothing it names is fetched. */
    it('draws in the strict mode of the library', async () => {
        await drawDiagram(SOURCE, stage());

        expect(mermaid.initialize).toHaveBeenCalledWith(
            expect.objectContaining({ securityLevel: 'strict', startOnLoad: false }),
        );
    });

    it('paints with the colours of the page, and a grey where the page has none', async () => {
        document.documentElement.style.setProperty('--markdown-fg', '#24292f');

        await drawDiagram(SOURCE, stage());

        const theme = mermaid.initialize.mock.calls.at(-1)?.[0].themeVariables;

        expect(theme).toMatchObject({ lineColor: '#888888', textColor: '#24292f' });
    });

    it('says why a source did not come out', async () => {
        mermaid.parse.mockRejectedValue(new Error('Parse error on line 2:\n  A -->'));

        await expect(drawDiagram(SOURCE, stage())).resolves.toEqual({
            kind: 'failed',
            message: 'Parse error on line 2:\n  A -->',
        });
        expect(mermaid.render).not.toHaveBeenCalled();
    });

    it('says what the library threw when it was not an error', async () => {
        mermaid.render.mockRejectedValue('sin diagrama');

        await expect(drawDiagram(SOURCE, stage())).resolves.toEqual({
            kind: 'failed',
            message: 'sin diagrama',
        });
    });

    /** The stage is shared by every drawing of the diagram, so each one leaves it empty. */
    it('leaves the stage empty, whether the drawing came out or not', async () => {
        const drawn = stage();
        const failed = stage();

        await drawDiagram(SOURCE, drawn);
        mermaid.parse.mockRejectedValue(new Error('Parse error'));
        await drawDiagram(SOURCE, failed);

        expect(drawn.childElementCount).toBe(0);
        expect(failed.childElementCount).toBe(0);
    });

    it('gives every drawing a name of its own', async () => {
        await drawDiagram(SOURCE, stage());
        await drawDiagram(SOURCE, stage());

        const [one, two] = mermaid.render.mock.calls.map(([id]) => id);

        expect(one).not.toBe(two);
    });
});
