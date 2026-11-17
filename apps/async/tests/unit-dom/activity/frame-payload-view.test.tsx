import { MessagesProvider } from '@mandor/i18n';
import { FORMAT_BYTES } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { FramePayloadView } from '../../../src/renderer/activity/components/dock/FramePayloadView.js';
import { frameFormat, type Frame } from '../../../src/renderer/activity/lib/frame-payload.js';

/** A frame that arrived as text and carries control bytes: two of them and a word after. */
const CONTROL = `${String.fromCodePoint(0, 1)}hola`;

/** A frame that never was text: four bytes, as the bridge encoded them. */
const BYTES: Frame = { binary: true, data: 'AAEC/w==' };

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function draw(frame: Frame, entryId = 'frame-1'): void {
    render(<FramePayloadView entryId={entryId} format={frameFormat(frame)} frame={frame} />, {
        wrapper: Wrapper,
    });
}

function text(data: string): Frame {
    return { data };
}

describe('the payload of the chosen frame', () => {
    it('names itself for the reader looking for what arrived', () => {
        draw(text('hola'));

        expect(screen.getByRole('group', { name: 'Mensaje' })).toBeVisible();
    });

    it('lays a frame out when it parses as JSON', async () => {
        draw(text('{"id":7,"ok":true}'));

        const view = byPart('frame-payload-view');
        const editor = await editorAt(0, view);

        expect(view).toHaveAttribute('data-format', 'json');
        expect(editor.text()).toBe('{\n    "id": 7,\n    "ok": true\n}');
        expect(editor.language()).toBe('jsonc');
    });

    /** A double would round it: the frame shows the digits that arrived. */
    it('lays JSON out without touching a number too long for a double', async () => {
        draw(text('{"id":12345678901234567890}'));

        expect((await editorAt(0)).text()).toBe('{\n    "id": 12345678901234567890\n}');
    });

    /** Laying out a hundred megabytes froze the window for seconds: past the cut it reads as it came. */
    it('shows a frame too large to lay out as it came, and says so', async () => {
        const data = `{"big":"${'x'.repeat(FORMAT_BYTES)}"}`;

        draw(text(data));

        expect((await editorAt(0)).text()).toBe(data);
        expect(
            screen.getByText('Demasiado grande para formatear: se muestra como llegó.'),
        ).toBeVisible();
    });

    it('says nothing of the size of a frame it lays out', async () => {
        draw(text('{"id":7}'));

        await editorAt(0);

        expect(screen.queryByText(/Demasiado grande/)).toBeNull();
    });

    it('keeps a text frame exactly as it came', async () => {
        draw(text('hola tal cual'));

        const view = byPart('frame-payload-view');

        expect(view).toHaveAttribute('data-format', 'text');
        expect((await editorAt(0, view)).text()).toBe('hola tal cual');
    });

    it('reads a text frame with control bytes by column, as a hex dump reads', async () => {
        draw(text(CONTROL));

        const view = byPart('frame-payload-view');
        const dump = (await editorAt(0, view)).text();

        expect(view).toHaveAttribute('data-format', 'binary');
        expect(dump.startsWith('00000000: 00 01 68 6F 6C 61')).toBe(true);
        expect(dump.endsWith('..hola')).toBe(true);
    });

    /** The base64 the frame travelled in is not what arrived: the bytes are. */
    it('dumps the bytes of a frame that never was text, not the text that carried them', async () => {
        draw(BYTES);

        const view = byPart('frame-payload-view');

        expect(view).toHaveAttribute('data-format', 'binary');
        expect((await editorAt(0, view)).text().startsWith('00000000: 00 01 02 FF')).toBe(true);
    });

    /**
     * Dumping a frame whole took seconds and hundreds of megabytes at twenty: the dump stops at
     * its first megabyte, says how much it left out, and the note of a text past the cut is not
     * one a dump has.
     */
    it('dumps only the head of a large binary frame, and says how much of it', async () => {
        draw({ binary: true, data: 'A'.repeat(8 * 1_048_576) });

        const dump = (await editorAt(0, byPart('frame-payload-view'))).text().split('\n');

        expect(dump).toHaveLength(1_048_576 / 16);
        expect(screen.getByText('Se muestra el primer 1.0 MB de 6.0 MB.')).toBeVisible();
        expect(screen.queryByText(/Demasiado grande/)).toBeNull();
    });

    it('says nothing of the size of a binary frame it dumps whole', async () => {
        draw(BYTES);

        await editorAt(0);

        expect(screen.queryByText(/Se muestra el primer/)).toBeNull();
    });

    /** Where a dump breaks its rows is the reader's choice: a protocol is read by its columns. */
    it('breaks the dump where the reader asks it to', async () => {
        draw(text(`${String.fromCodePoint(0)}${'a'.repeat(15)}`));

        const width = screen.getByRole('combobox', { name: 'Bytes por fila' });

        fireEvent.keyDown(width, { code: 'ArrowDown', key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: '8' }));

        expect((await editorAt(0)).text().split('\n')).toHaveLength(2);
    });

    /** The frame is the evidence: the editor draws it with line numbers and no caret. */
    it('edits nothing', async () => {
        draw(text('{"id":7}'));

        const editor = await editorAt(0);

        editor.typeOver('otra cosa');

        expect(editor.readOnly()).toBe(true);
        expect(editor.text()).toBe('{\n    "id": 7\n}');
    });
});
