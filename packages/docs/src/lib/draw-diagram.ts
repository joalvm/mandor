// The typings of the built bundle are ambient, and an import cannot carry an ambient declaration
// into the projects that read this file: only a reference does.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./mermaid-bundle.d.ts" />

/** What comes back from drawing: a picture and its natural size, or why it did not come out. */
export type DiagramDrawing =
    | { height: number; kind: 'drawn'; src: string; width: number }
    | { kind: 'failed'; message: string };

/**
 * The family Mermaid measures with and the one the picture is painted in have to be the same.
 * A picture of SVG loads none of the fonts of the page, so the system's is used on both sides.
 */
const FAMILY = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** What a token says when the stylesheet that sets it is not there: a grey Mermaid can read. */
const UNSET = '#888888';

/** The value of one colour of the page, as the stylesheet of the markdown spells it: `#rrggbb`. */
function colour(token: string): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();

    return value === '' ? UNSET : value;
}

/** The `base` theme of Mermaid, filled with the colours of the page: it changes with the theme. */
function themeVariables(): Record<string, string> {
    return {
        background: colour('--markdown-canvas-subtle'),
        fontFamily: FAMILY,
        fontSize: '13px',
        lineColor: colour('--markdown-fg-muted'),
        mainBkg: colour('--markdown-canvas'),
        noteBkgColor: colour('--markdown-canvas-subtle'),
        noteBorderColor: colour('--markdown-border'),
        noteTextColor: colour('--markdown-fg'),
        primaryBorderColor: colour('--markdown-border'),
        primaryColor: colour('--markdown-canvas'),
        primaryTextColor: colour('--markdown-fg'),
        secondaryColor: colour('--markdown-canvas-subtle'),
        tertiaryColor: colour('--markdown-canvas'),
        textColor: colour('--markdown-fg'),
    };
}

const drawn = { count: 0 };

/**
 * The SVG of Mermaid, handed out as a picture. Nothing runs inside a picture and nothing loads:
 * whatever the diagram carries stays in it, and its `<style>` needs none of the permission the
 * policy of the window does not give a style without its nonce.
 */
function asPicture(svg: string): DiagramDrawing {
    const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const [, , width = 0, height = 0] = (root.getAttribute('viewBox') ?? '')
        .split(/\s+/)
        .map(Number);

    root.setAttribute('width', String(Math.ceil(width)));
    root.setAttribute('height', String(Math.ceil(height)));
    root.removeAttribute('style');

    const text = new XMLSerializer().serializeToString(root);

    return {
        height,
        kind: 'drawn',
        src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`,
        width,
    };
}

/**
 * Draws one diagram inside `stage`, an element of the page that is out of sight, and lets the
 * drawing go. Mermaid measures its labels in the page, and the stylesheet of the stage is what
 * gives them the type they are painted in, since the style Mermaid writes for itself is one the
 * window does not apply. The library is loaded the first time a doc carries a diagram, not before.
 *
 * It is loaded as the bundle Mermaid ships built: its entry point pulls two thousand modules of
 * its dependencies into the build of each app, which then runs out of memory putting them together.
 */
export async function drawDiagram(source: string, stage: HTMLElement): Promise<DiagramDrawing> {
    const { default: mermaid } = await import('mermaid/dist/mermaid.esm.min.mjs');

    mermaid.initialize({
        fontFamily: FAMILY,
        htmlLabels: false,
        securityLevel: 'strict',
        startOnLoad: false,
        theme: 'base',
        themeVariables: themeVariables(),
    });

    try {
        await mermaid.parse(source);
        drawn.count += 1;

        const { svg } = await mermaid.render(`doc-diagram-${String(drawn.count)}`, source, stage);

        return asPicture(svg);
    } catch (error) {
        return { kind: 'failed', message: error instanceof Error ? error.message : String(error) };
    } finally {
        stage.replaceChildren();
    }
}
