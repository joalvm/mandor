import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { windowBridge } from '@mandor/ipc/testing';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { consoleStore } from '../../src/console/console-store.js';
import { reportFault } from '../../src/fault/report-fault.js';
import { useWindowConsole } from '../../src/hooks/useWindowConsole.js';
import { recordNotice } from '../../src/record-notice.js';

function Wrapper({ children }: { children: ReactNode }) {
    return <MessagesProvider preferences={{ language: 'es' }}>{children}</MessagesProvider>;
}

function hear(): () => void {
    const { unmount } = renderHook(
        () => {
            useWindowConsole();
        },
        { wrapper: Wrapper },
    );

    return unmount;
}

/** The entries without what the console stamps on them: the key, the time and the weight. */
function written() {
    return consoleStore
        .getState()
        .entries.map(({ level, text, detail, source }) => ({ level, text, detail, source }));
}

beforeEach(() => {
    consoleStore.getState().clear();
    windowBridge().log.write = () => Promise.resolve(success({}));
});

afterEach(() => {
    cleanup();
});

// The lines come through window-console, the channel the notices and the faults tell.
describe('what the window itself writes to its console', () => {
    it('writes every notice, the news too, in the tone it was shown with', () => {
        hear();

        act(() => {
            recordNotice({ tone: 'success', title: 'Guardado' });
            recordNotice({ tone: 'error', title: 'No se pudo guardar', detail: 'EACCES' });
        });

        expect(written()).toEqual([
            { level: 'info', text: 'Guardado', detail: undefined, source: 'Ventana' },
            { level: 'error', text: 'No se pudo guardar', detail: 'EACCES', source: 'Ventana' },
        ]);
    });

    it('writes a fault with its stack, and a recovered one as a warning', () => {
        hear();

        act(() => {
            reportFault('unawaited', 'se perdió');
            reportFault('react-recoverable', new Error('repintado'));
        });

        const entries = written();

        expect(entries[0]).toEqual({
            level: 'error',
            text: 'se perdió',
            detail: undefined,
            source: 'Ventana',
        });
        expect(entries[1]).toMatchObject({ level: 'warn', text: 'repintado' });
        expect(entries[1]?.detail).toContain('repintado');
    });

    it('writes nothing once the window stops hearing', () => {
        const unmount = hear();

        unmount();
        act(() => {
            recordNotice({ tone: 'warning', title: 'tarde' });
        });

        expect(written()).toEqual([]);
    });
});
