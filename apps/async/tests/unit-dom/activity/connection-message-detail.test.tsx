import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ConnectionMessageEntry } from '../../../src/renderer/activity/activity-entry.js';
import { ConnectionMessageDetail } from '../../../src/renderer/activity/components/dock/ConnectionMessageDetail.js';

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function frameEntry(detail: { binary?: true; data: string }): ConnectionMessageEntry {
    return {
        at: 1700000000000,
        bytes: 12,
        detail: { at: 1700000000000, direction: 'in', environmentId: null, ...detail },
        id: 'frame-1',
        kind: 'connection-message',
    };
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
});
