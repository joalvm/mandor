import { MessagesProvider } from '@mandor/i18n';
import { ToastProvider, TooltipProvider, type ToastRequest } from '@mandor/ui';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopyText } from '../../src/hooks/useCopyText.js';

const writeText = vi.fn<(text: string) => Promise<void>>();

/** Every toast the window was asked to raise, in order. */
let told: ToastRequest[] = [];

function Window({ children }: PropsWithChildren) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Cerrar aviso', more: (count) => `+${String(count)}` }}
                    onNotify={(request) => {
                        told.push(request);
                    }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}

beforeEach(() => {
    told = [];
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

describe('copying a text', () => {
    it('puts the text on the clipboard and says it did', async () => {
        const { result } = renderHook(() => useCopyText(), { wrapper: Window });

        result.current('hola');

        expect(writeText).toHaveBeenCalledWith('hola');
        await waitFor(() => {
            expect(told).toEqual([{ title: 'Copiado', tone: 'success' }]);
        });
    });

    /** A copy nobody saw is not a copy: a refused clipboard says so, as any failure does. */
    it('says it could not when the clipboard refuses', async () => {
        writeText.mockRejectedValue(new Error('denied'));

        const { result } = renderHook(() => useCopyText(), { wrapper: Window });

        result.current('hola');

        await waitFor(() => {
            expect(told.map((request) => request.tone)).toEqual(['error']);
        });
    });
});
