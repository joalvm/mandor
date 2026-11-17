import { MessagesProvider } from '@mandor/i18n';
import type { FakeBridge } from '@mandor/ipc/testing';
import { ToastProvider, TooltipProvider } from '@mandor/ui';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { NoticeFeed } from '../../../src/components/notice-center/NoticeFeed.js';

type Mandor = { mandor: FakeBridge };

afterEach(() => {
    cleanup();
});

describe('the feed of notices as a component', () => {
    it('lets the toast say what main raised, in the language of the window', () => {
        render(
            <MessagesProvider preferences={{ language: 'en' }}>
                <TooltipProvider>
                    <ToastProvider
                        messages={{ close: 'Close', more: (count) => `+${String(count)}` }}
                    >
                        <NoticeFeed />
                    </ToastProvider>
                </TooltipProvider>
            </MessagesProvider>,
        );

        act(() => {
            (window as unknown as Mandor).mandor.emitNotice({
                id: 1,
                code: 'files-unreadable',
                tone: 'warning',
                params: { count: 2, names: ['Login', 'Pagos'] },
            });
        });

        expect(screen.getByText('2 files could not be read: Login, Pagos')).toBeVisible();
    });
});
