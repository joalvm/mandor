import { MessagesProvider } from '@mandor/i18n';
import type { ErrorCode } from '@mandor/ipc';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { byPart } from '@mandor/ui/testing';

import type { ConnectionFaultEntry } from '../../../src/renderer/activity/activity-entry.js';
import { ConnectionFaultDetail } from '../../../src/renderer/activity/components/dock/ConnectionFaultDetail.js';
import { FaultActionsContext } from '../../../src/renderer/activity/fault-actions.js';

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>;
}

function faultEntry(code: ErrorCode, message?: string): ConnectionFaultEntry {
    return {
        at: 1700000000000,
        bytes: 0,
        detail: { at: 1700000000000, code, message },
        id: 'fault-1',
        kind: 'connection-fault',
    };
}

describe('the detail of a fault', () => {
    it('reads the failure whole, translated from its code alone', () => {
        render(<ConnectionFaultDetail entry={faultEntry('ws-open-failed')} />, {
            wrapper: Wrapper,
        });

        expect(byPart('activity-detail')).toHaveTextContent('No se pudo abrir la conexión.');
    });

    it('translates every code the socket can fail with', () => {
        render(<ConnectionFaultDetail entry={faultEntry('ws-send-failed')} />, {
            wrapper: Wrapper,
        });

        expect(byPart('activity-detail')).toHaveTextContent(
            'No se pudo enviar el mensaje porque el socket no está abierto.',
        );
    });

    /** The moment and the direction are the band's to say; the dock adds nothing of the kind. */
    it('says nothing but the message itself', () => {
        render(<ConnectionFaultDetail entry={faultEntry('fs-read')} />, { wrapper: Wrapper });

        const shown = byPart('activity-detail');

        expect(shown).toHaveAttribute('data-format', 'text');
        expect(shown.textContent).toBe('Mandor no pudo leer el archivo solicitado.');
    });

    it('says under the failure what the transport said, as it said it', () => {
        render(
            <ConnectionFaultDetail
                entry={faultEntry('ws-open-failed', 'getaddrinfo ENOTFOUND badurl')}
            />,
            { wrapper: Wrapper },
        );

        expect(byPart('activity-detail').textContent).toBe(
            'No se pudo abrir la conexión.getaddrinfo ENOTFOUND badurl',
        );
    });

    it('offers to connect past the scripts when one kept the socket shut', () => {
        const connectWithoutScripts = vi.fn();

        render(
            <FaultActionsContext value={{ connectWithoutScripts }}>
                <ConnectionFaultDetail entry={faultEntry('script-failed')} />
            </FaultActionsContext>,
            { wrapper: Wrapper },
        );

        fireEvent.click(screen.getByRole('button', { name: 'Conectar sin scripts' }));

        expect(connectWithoutScripts).toHaveBeenCalledOnce();
    });

    it('offers no way past the scripts for another failure, nor outside a connection', () => {
        const actions = { connectWithoutScripts: vi.fn() };
        const { unmount } = render(
            <FaultActionsContext value={actions}>
                <ConnectionFaultDetail entry={faultEntry('ws-open-failed')} />
            </FaultActionsContext>,
            { wrapper: Wrapper },
        );

        expect(screen.queryByRole('button')).toBeNull();
        unmount();

        render(<ConnectionFaultDetail entry={faultEntry('script-failed')} />, { wrapper: Wrapper });

        expect(screen.queryByRole('button')).toBeNull();
    });
});
