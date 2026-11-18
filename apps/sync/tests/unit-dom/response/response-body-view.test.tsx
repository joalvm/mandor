import { HEX_DUMP_BYTES } from '@mandor/ui';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResponseBodyView } from '../../../src/renderer/response/ResponseBodyView.js';
import type { BodyContent } from '../../../src/renderer/response/lib/body-content.js';
import type { BodyFormat } from '../../../src/renderer/response/lib/body-formats.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

function content(over: Partial<BodyContent> = {}): BodyContent {
    return {
        bytes: Uint8Array.of(1, 2, 3),
        dataUrl: null,
        kind: 'text',
        language: 'plaintext',
        text: 'hola',
        ...over,
    };
}

/** How the reader asked to see the body: in a format, or drawn. */
type Show = { format?: BodyFormat; preview?: boolean };

function draw(body: BodyContent, show: Show, onNearEnd = vi.fn()): void {
    render(
        <ResponseBodyView
            content={body}
            format={show.format ?? 'raw'}
            modelKey="r1"
            onNearEnd={onNearEnd}
            preview={show.preview ?? false}
            total={body.bytes.length}
            wrap
        />,
        { wrapper: AppProviders },
    );
}

describe('ResponseBodyView, one body in the view the reader chose (BodyPreview or BodyText)', () => {
    it('draws the bytes as a dump', () => {
        draw(content(), { format: 'hex' });

        expect(document.querySelector('[data-part="hex-view"]')).toBeInTheDocument();
        expect(screen.queryByText(/Showing the first/)).toBeNull();
    });

    /** The dump stops at its first megabyte, however much was read, and says of how much. */
    it('says how much of a body larger than its dump the dump shows', () => {
        render(
            <ResponseBodyView
                content={content({ bytes: new Uint8Array(HEX_DUMP_BYTES + 1) })}
                format="hex"
                modelKey="r1"
                onNearEnd={vi.fn()}
                preview={false}
                total={10_000_000}
                wrap
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('Showing the first 1.0 MB of 10.0 MB.')).toBeVisible();
    });

    it('says it is reading while an image is not all here, and draws it once it is', () => {
        draw(content({ kind: 'image' }), { preview: true });

        expect(screen.getByText('Reading the body…')).toBeVisible();

        cleanup();
        draw(content({ dataUrl: 'data:image/png;base64,AQID', kind: 'image' }), { preview: true });

        expect(screen.getByRole('img', { name: 'Image in the response' })).toHaveAttribute(
            'src',
            'data:image/png;base64,AQID',
        );
    });

    it('puts a page in a frame that is allowed nothing', () => {
        draw(content({ kind: 'html', text: '<p>x</p>' }), { preview: true });

        const frame = screen.getByTitle('Page in the response');

        expect(frame).toHaveAttribute('sandbox', '');
        expect(frame).toHaveAttribute('srcdoc', '<p>x</p>');
    });

    /** How near the end the view stands is measured on screen; the end-to-end test reads it there. */
    it('reads text in the editor, and asks for no more while the editor has no size', async () => {
        const onNearEnd = vi.fn();

        draw(content(), { format: 'raw' }, onNearEnd);

        await waitFor(() => {
            expect(document.querySelector('[data-part="code-editor"]')).toBeInTheDocument();
        });
        expect(onNearEnd).not.toHaveBeenCalled();
    });

    it('does not ask for more while a view that draws no text is on screen', () => {
        const onNearEnd = vi.fn();

        draw(content(), { format: 'hex' }, onNearEnd);

        expect(onNearEnd).not.toHaveBeenCalled();
    });

    it('says the body is being read while a page to draw has not all arrived', () => {
        draw(content({ kind: 'html', text: '' }), { preview: true });

        expect(screen.getByText('Reading the body…')).toBeInTheDocument();
        expect(document.querySelector('[data-part="response-page"]')).toBeNull();
    });

    it('draws a JSON document as a tree: its first level open, what holds more closed', () => {
        draw(content({ kind: 'json', text: '{"id":7,"debug":{"line":1}}' }), { preview: true });

        const table = document.querySelector('[data-part="response-json"]');

        expect(table).toHaveTextContent('id7');
        expect(screen.getByRole('treeitem', { name: /debug/ })).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });
});
