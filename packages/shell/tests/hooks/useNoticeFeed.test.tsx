import { MessagesProvider } from '@mandor/i18n';
import { success, type NoticePush } from '@mandor/ipc';
import type { FakeBridge } from '@mandor/ipc/testing';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, renderHook, screen } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useNoticeFeed } from '../../src/hooks/useNoticeFeed.js';
import { shellStore } from '../../src/index.js';
import { recordNotice } from '../../src/record-notice.js';

type Mandor = { mandor: FakeBridge };

function bridge(): FakeBridge {
    return (window as unknown as Mandor).mandor;
}

const FILES: NoticePush = {
    id: 1,
    code: 'files-unreadable',
    tone: 'warning',
    key: 'files-unreadable',
    params: { count: 1, names: ['Login'] },
};

const TEXT = '1 archivo no se pudo leer: Login';

/** The window as an app draws it, strict mode included: effects run, stop and run again. */
function Window({ children }: PropsWithChildren) {
    return (
        <StrictMode>
            <MessagesProvider preferences={{ language: 'es' }}>
                <TooltipProvider>
                    <ToastProvider
                        messages={{ close: 'Cerrar aviso', more: (count) => `+${String(count)}` }}
                        onNotify={recordNotice}
                    >
                        {children}
                    </ToastProvider>
                </TooltipProvider>
            </MessagesProvider>
        </StrictMode>
    );
}

function mount(): void {
    renderHook(
        () => {
            useNoticeFeed();
        },
        { wrapper: Window },
    );
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('useNoticeFeed', () => {
    it('shows a notice of main in the language of the window and keeps it in the centre', () => {
        mount();

        act(() => {
            bridge().emitNotice(FILES);
        });

        expect(screen.getByText(TEXT)).toBeVisible();
        expect(shellStore.getState().notices.map((notice) => notice.title)).toEqual([TEXT]);
    });

    it('tells once a notice that came by the list and is pushed again', async () => {
        bridge().notice.list = () => Promise.resolve(success([FILES]));
        mount();

        await screen.findByText(TEXT);
        act(() => {
            bridge().emitNotice(FILES);
        });

        expect(shellStore.getState().notices).toHaveLength(1);
        expect(shellStore.getState().notices[0]?.count).toBe(1);
    });
});
