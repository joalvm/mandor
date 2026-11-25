import { MessagesProvider } from '@mandor/i18n';
import { PreferencesProvider } from '@mandor/prefs';
import { ToastProvider, TooltipProvider, type ToastRequest } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

type AppProvidersProps = PropsWithChildren<{
    /** Hears every toast the tree raises, for a test that reads what it was asked to say. */
    onNotify?: ((request: ToastRequest) => void) | undefined;
}>;

/** The providers every renderer tree of Mandor Realtime is mounted under, in English. */
export function AppProviders({ children, onNotify }: AppProvidersProps) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count) => `${String(count)} more` }}
                    onNotify={onNotify}
                >
                    <PreferencesProvider>{children}</PreferencesProvider>
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>
    );
}
