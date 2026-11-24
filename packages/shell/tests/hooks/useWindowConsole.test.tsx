import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { windowBridge } from '@mandor/ipc/testing';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { consoleStore, writeConsole } from '../../src/console/console-store.js';
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

function runs() {
    return consoleStore.getState().runs;
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

        expect(runs()).toHaveLength(1);
        expect(runs()[0]?.title).toBe('Ventana');
        expect(runs()[0]?.lines).toEqual([
            { key: '1', tone: 'info', text: 'Guardado', detail: undefined },
            { key: '2', tone: 'error', text: 'No se pudo guardar', detail: 'EACCES' },
        ]);
    });

    it('writes a fault with its stack, and a recovered one as a warning', () => {
        hear();

        act(() => {
            reportFault('unawaited', 'se perdió');
            reportFault('react-recoverable', new Error('repintado'));
        });

        const lines = runs()[0]?.lines ?? [];

        expect(lines[0]).toEqual({ key: '1', tone: 'error', text: 'se perdió', detail: undefined });
        expect(lines[1]).toMatchObject({ tone: 'warn', text: 'repintado' });
        expect(lines[1]?.detail).toContain('repintado');
    });

    it('opens a new run when anything else wrote between two of its lines', () => {
        hear();

        act(() => {
            recordNotice({ tone: 'info', title: 'uno' });
            writeConsole({ id: 'send', title: 'POST Sesión' }, [
                { key: 'a', tone: 'log', text: 'x' },
            ]);
            recordNotice({ tone: 'info', title: 'dos' });
        });

        expect(runs().map((run) => run.title)).toEqual(['Ventana', 'POST Sesión', 'Ventana']);
    });

    it('writes nothing once the window stops hearing', () => {
        const unmount = hear();

        unmount();
        act(() => {
            recordNotice({ tone: 'warning', title: 'tarde' });
        });

        expect(runs()).toEqual([]);
    });
});
