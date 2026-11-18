import { MessagesProvider } from '@mandor/i18n';
import { ToastProvider, TooltipProvider, type ToastRequest } from '@mandor/ui';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { useFailureToast } from '../../src/hooks/useFailureToast.js';

const FS_READ = 'Mandor no pudo leer el archivo solicitado.';

describe('the toast of a failure', () => {
    it('tells the code in the words of the interface, as an error', () => {
        const told: ToastRequest[] = [];

        function Window({ children }: PropsWithChildren) {
            return (
                <MessagesProvider preferences={{ language: 'es' }}>
                    <TooltipProvider>
                        <ToastProvider
                            messages={{
                                close: 'Cerrar aviso',
                                more: (count) => `+${String(count)}`,
                            }}
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

        const { result } = renderHook(() => useFailureToast(), { wrapper: Window });

        act(() => {
            result.current('fs-read');
        });

        expect(told).toEqual([{ title: FS_READ, tone: 'error' }]);
    });

    it('stays the same function from one drawing to the next', () => {
        function Window({ children }: PropsWithChildren) {
            return (
                <MessagesProvider preferences={{ language: 'es' }}>
                    <TooltipProvider>
                        <ToastProvider
                            messages={{
                                close: 'Cerrar aviso',
                                more: (count) => `+${String(count)}`,
                            }}
                        >
                            {children}
                        </ToastProvider>
                    </TooltipProvider>
                </MessagesProvider>
            );
        }

        const { rerender, result } = renderHook(() => useFailureToast(), { wrapper: Window });
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });
});
