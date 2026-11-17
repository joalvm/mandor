import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HexView } from '../../../src/components/editor/HexView.js';
import { TooltipProvider } from '../../../src/components/tooltip/TooltipProvider.js';
import { HEX_DUMP_BYTES } from '../../../src/editor/hex-dump.js';
import { editorAt } from '../../../src/testing/editors-in.js';

const LABELS = {
    bytesPerRow: 'Bytes por línea',
    copy: 'Copiar',
    editor: 'Carga',
    hideText: 'Ocultar el texto',
    showText: 'Mostrar el texto',
};

const BYTES = new Uint8Array([0x68, 0x6f, 0x6c, 0x61, 0x00, 0x01, 0x02, 0x03, 0x04]);

function draw() {
    return render(
        <TooltipProvider>
            <HexView bytes={BYTES} labels={LABELS} modelKey="frame-1" />
        </TooltipProvider>,
    );
}

afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
});

describe('the view of a frame that arrived as bytes', () => {
    it('carries its controls on a band as tall as a toolbar, not as a list row', () => {
        draw();

        const band = screen
            .getByRole('combobox', { name: 'Bytes por línea' })
            .closest('[data-part="hex-view-band"]');

        expect(band).toHaveClass('h-section');
    });

    it('dumps the bytes, sixteen to the line, in a text nobody writes', async () => {
        draw();

        const shown = await editorAt(0);

        expect(shown.text()).toBe(
            '00000000: 68 6F 6C 61 00 01 02 03 04                       hola.....',
        );
        expect(shown.language()).toBe('binary');
        expect(shown.readOnly()).toBe(true);
    });

    /** A dock is as wide as the person left it, and the columns that fit change with it. */
    /** Dumping twenty megabytes took seconds and hundreds of megabytes: the dump stops at one. */
    it('dumps no more than its first megabyte, however many bytes it is handed', async () => {
        render(
            <TooltipProvider>
                <HexView bytes={new Uint8Array(HEX_DUMP_BYTES + 16)} labels={LABELS} modelKey="m" />
            </TooltipProvider>,
        );

        expect((await editorAt(0)).text().split('\n')).toHaveLength(HEX_DUMP_BYTES / 16);
    });

    it('breaks the dump where the reader asks', async () => {
        draw();

        const width = screen.getByRole('combobox', { name: 'Bytes por línea' });

        fireEvent.keyDown(width, { code: 'ArrowDown', key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: '8' }));

        expect((await editorAt(0)).text().split('\n')).toHaveLength(2);
    });

    it('hides the text of the bytes when the reader has no words to read in them', async () => {
        draw();

        fireEvent.click(screen.getByRole('button', { name: 'Ocultar el texto' }));

        expect((await editorAt(0)).text()).toBe('00000000: 68 6F 6C 61 00 01 02 03 04');
        expect(screen.getByRole('button', { name: 'Mostrar el texto' })).toBeInTheDocument();
    });

    /** The menu of the editor copies what is selected; the button takes the whole dump. */
    it('copies the whole dump, not the line the caret sits on', () => {
        const writeText = vi.fn().mockResolvedValue(undefined);

        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        draw();
        fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));

        expect(writeText).toHaveBeenCalledWith(
            '00000000: 68 6F 6C 61 00 01 02 03 04                       hola.....',
        );
    });
});
