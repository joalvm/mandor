import { MessagesProvider } from '@mandor/i18n';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ConnectionMessageEntry } from '../../../src/renderer/activity/activity-entry.js';
import { ConnectionMessageDetail } from '../../../src/renderer/activity/components/dock/ConnectionMessageDetail.js';
import { formattedPayload } from '../../../src/renderer/activity/lib/formatted-payload.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Cerrar aviso', more: (count) => `+${String(count)}` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

function frameEntry(
    detail: { binary?: true; data: string },
    id = 'frame-1',
): ConnectionMessageEntry {
    return {
        at: 1700000000000,
        bytes: 12,
        detail: { at: 1700000000000, direction: 'in', environmentId: null, ...detail },
        id,
        kind: 'connection-message',
    };
}

const JSON_FRAME = '{"id":7,"ok":true}';

/** Opens the menu of views on the band and picks one by its name. */
async function chooseView(name: string): Promise<void> {
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Formato del mensaje/ }), {
        button: 0,
        ctrlKey: false,
    });
    fireEvent.click(await screen.findByRole('menuitem', { name }));
}

describe('the detail of a chosen frame', () => {
    /**
     * The dock draws again with every frame that crosses the socket. Reading a frame of fifty
     * megabytes takes a second: done on every one of those draws, a busy socket froze the window.
     */
    it('reads what the frame is once, not on every draw of the dock', () => {
        const data = '{"id":7,"ok":true}';
        const parse = vi.spyOn(JSON, 'parse');
        const shown = render(<ConnectionMessageDetail entry={frameEntry({ data })} />, {
            wrapper: Wrapper,
        });

        shown.rerender(<ConnectionMessageDetail entry={frameEntry({ data })} />);

        const reads = parse.mock.calls.filter(([text]) => text === data).length;

        parse.mockRestore();
        expect(reads).toBe(1);
    });

    /** New bytes on every draw made the dump of the whole frame again with every frame that crossed. */
    it('decodes the bytes of a frame once, not on every draw of the dock', () => {
        const data = 'AAEC/w==';
        const decode = vi.spyOn(globalThis, 'atob');
        const shown = render(
            <ConnectionMessageDetail entry={frameEntry({ binary: true, data })} />,
            {
                wrapper: Wrapper,
            },
        );

        shown.rerender(<ConnectionMessageDetail entry={frameEntry({ binary: true, data })} />);

        const reads = decode.mock.calls.filter(([text]) => text === data).length;

        decode.mockRestore();
        expect(reads).toBe(1);
    });

    it('shows a frame that parses as JSON laid out, and says so on the dock', async () => {
        render(<ConnectionMessageDetail entry={frameEntry({ data: '{"id":7,"ok":true}' })} />, {
            wrapper: Wrapper,
        });

        const shown = byPart('activity-detail');

        expect(shown).toHaveAttribute('data-format', 'json');
        expect((await editorAt(0, shown)).text()).toContain('"id": 7');
    });

    /** What travelled is base64; what arrived are the bytes, and those are what is read. */
    it('dumps a frame that never was text, byte by byte', async () => {
        render(<ConnectionMessageDetail entry={frameEntry({ binary: true, data: 'AAEC/w==' })} />, {
            wrapper: Wrapper,
        });

        const shown = byPart('activity-detail');

        expect(shown).toHaveAttribute('data-format', 'binary');
        expect((await editorAt(0, shown)).text()).toContain('00 01 02 FF');
    });

    it('shows a frame that never was text in the format it arrived in', async () => {
        render(<ConnectionMessageDetail entry={frameEntry({ data: 'hola tal cual' })} />, {
            wrapper: Wrapper,
        });

        const shown = byPart('activity-detail');

        expect(shown).toHaveAttribute('data-format', 'text');
        expect((await editorAt(0, shown)).text()).toBe('hola tal cual');
    });

    /** The band says what the frame turned out to be, and opens it on that. */
    it('opens a frame on the view its format calls for, and names it on the band', () => {
        render(<ConnectionMessageDetail entry={frameEntry({ data: JSON_FRAME })} />, {
            wrapper: Wrapper,
        });

        expect(screen.getByRole('button', { name: 'Formato del mensaje: JSON' })).toBeVisible();
        expect(byPart('activity-dock-head')).toHaveTextContent('Recibido');
    });

    it('opens a frame that never was text on its bytes', () => {
        render(<ConnectionMessageDetail entry={frameEntry({ binary: true, data: 'AAEC/w==' })} />, {
            wrapper: Wrapper,
        });

        expect(screen.getByRole('button', { name: 'Formato del mensaje: Hex' })).toBeVisible();
    });

    it('reads the frame exactly as it came on choosing Raw', async () => {
        render(<ConnectionMessageDetail entry={frameEntry({ data: JSON_FRAME })} />, {
            wrapper: Wrapper,
        });

        await chooseView('Raw');

        await waitFor(async () => {
            expect((await editorAt(0, byPart('activity-detail'))).text()).toBe(JSON_FRAME);
        });
    });

    /** A text frame is bytes too: the reader asks for them, and the dump is of what was sent. */
    it('dumps a text frame on choosing Hex, with the copy of the dump and none of its own', async () => {
        render(<ConnectionMessageDetail entry={frameEntry({ data: JSON_FRAME })} />, {
            wrapper: Wrapper,
        });

        await chooseView('Hex');

        await waitFor(async () => {
            expect(
                (await editorAt(0, byPart('activity-detail'))).text().startsWith('00000000: 7B 22'),
            ).toBe(true);
        });
        expect(screen.getAllByRole('button', { name: 'Copiar' })).toHaveLength(1);
        expect(byPart('activity-dock-head')).not.toContainElement(
            screen.getByRole('button', { name: 'Copiar' }),
        );
    });

    it('copies the frame as the view shows it', async () => {
        const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);

        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        render(<ConnectionMessageDetail entry={frameEntry({ data: JSON_FRAME })} />, {
            wrapper: Wrapper,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));

        const shown = formattedPayload(JSON_FRAME, 'json');

        expect(shown).toContain('\n');
        expect(writeText).toHaveBeenCalledWith(shown);
        await waitFor(() => {
            expect(screen.getByText('Copiado')).toBeVisible();
        });
    });

    /** What the reader chose was for the frame they chose it on: the next one opens on its own. */
    it('opens the next frame on the view its own format calls for', async () => {
        const shown = render(<ConnectionMessageDetail entry={frameEntry({ data: JSON_FRAME })} />, {
            wrapper: Wrapper,
        });

        await chooseView('Raw');
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Formato del mensaje: Raw' })).toBeVisible();
        });

        shown.rerender(
            <ConnectionMessageDetail entry={frameEntry({ data: '{"id":8}' }, 'frame-2')} />,
        );

        expect(screen.getByRole('button', { name: 'Formato del mensaje: JSON' })).toBeVisible();
        expect((await editorAt(0, byPart('activity-detail'))).text()).toBe(
            formattedPayload('{"id":8}', 'json'),
        );
    });
});
