import { MessagesProvider } from '@mandor/i18n';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConnectionMessageRow } from '../../../src/renderer/activity/components/row/ConnectionMessageRow.js';
import { messageEntryOf } from '../support/activity-entries.js';

type RecordExtra =
    | { event?: string; replyTo?: string; elapsedMs?: number }
    | { replyTo: string; timedOut: true; event?: string }
    | { binary: true };

function entryOf(data: string, extra?: RecordExtra) {
    return messageEntryOf({ data, ...extra });
}

function draw(data: string, extra?: Parameters<typeof entryOf>[1]) {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <ConnectionMessageRow entry={entryOf(data, extra)} />
        </MessagesProvider>,
    );
}

describe('one row of the timeline', () => {
    it('names the direction with the arrow, and nothing else', () => {
        draw('hola');

        expect(screen.getByRole('img', { name: 'Recibido' })).toBeVisible();
        expect(screen.queryByRole('img', { name: 'Enviado' })).toBeNull();
    });

    it('carries the time and the size of the frame', () => {
        draw('hola');

        expect(screen.getByRole('time')).toBeInTheDocument();
        expect(screen.getByText('4 B')).toBeInTheDocument();
    });

    /** A payload of two lines must never stretch the row: the row is one line, always. */
    it('previews the payload on a single line, however many it has', () => {
        draw('primera línea\nsegunda línea');

        const preview = screen.getByText(/primera línea/u);

        expect(preview).toHaveAttribute('data-part', 'activity-preview');
        expect(preview).toHaveClass('truncate');
        expect(preview.textContent).not.toContain('segunda');
    });

    /** Three columns: the arrow, the middle that names and previews the frame, time and weight. */
    it('sits the middle column between the arrow and the time, taking the room left over', () => {
        draw('hola');

        const middle = screen.getByText('hola').parentElement;
        const row = middle?.parentElement;
        const columns = row ? [...row.children] : [];

        expect(columns[0]).toHaveAttribute('data-part', 'activity-direction');
        expect(columns[1]).toHaveAttribute('data-part', 'activity-middle');
        expect(columns.at(-2)).toHaveAttribute('dateTime');
        expect(columns.at(-1)).toHaveTextContent('B');
    });

    it('goes before the payload the name of the event that carried the frame', async () => {
        draw('{"value":1}', { event: 'chat:message' });
        await act(() => Promise.resolve());

        expect(screen.getByText('chat:message')).toBeVisible();
    });

    it('says nothing about events when the transport carries none', () => {
        draw('hola');

        const middle = screen.getByText('hola').parentElement;

        expect(middle?.querySelector('[data-part="activity-event"]')).toBeNull();
    });

    /** The base64 the frame travelled in is not what arrived: the row shows the bytes. */
    it('previews a frame that never was text as the bytes it opens with', () => {
        draw('AAEC/w==', { binary: true });

        expect(screen.getByText('00 01 02 FF')).toHaveAttribute('data-part', 'activity-preview');
    });

    it('draws the answer indented under its emission, with the time it took', () => {
        draw('hola', { replyTo: 'ack-1', elapsedMs: 132 });

        const row = screen.getByText('hola').closest('[data-part="activity-row"]');

        expect(row).toHaveAttribute('data-reply', 'true');
        expect(screen.getByText('132 ms')).toBeVisible();
    });

    it('wears the fault of the timeline when the wait ran out unanswered', () => {
        draw('', { replyTo: 'ack-1', timedOut: true, event: 'chat:message' });

        const row = screen
            .getByText('chat:message — Ack sin respuesta')
            .closest('[data-part="activity-row"]');

        expect(row).toHaveAttribute('data-reply', 'fault');
    });
});
