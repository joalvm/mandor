import { MessagesProvider } from '@mandor/i18n';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import type { ReactNode } from 'react';

/** The providers every renderer tree of Mandor Realtime is mounted under, in English. */
export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count) => `${String(count)} more` }}
                >
                    {children}
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}
