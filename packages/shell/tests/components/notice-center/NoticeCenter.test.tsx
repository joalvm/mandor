import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NoticeCenter } from '../../../src/components/notice-center/NoticeCenter.js';
import { NoticeCenterItem } from '../../../src/components/notice-center/NoticeCenterItem.js';
import { windowSurface } from '../../../src/command/window-surface.js';
import { selectUnreadNotices } from '../../../src/notices.slice.js';
import { recordNotice } from '../../../src/record-notice.js';
import { shellStore } from '../../../src/index.js';
import { useStatusItems } from '../../../src/status/status-item-registry.js';

function draw() {
    return render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <NoticeCenter />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

/** The element at a place of a list the test already knows is that long. */
function at<T>(items: readonly T[], index: number): T {
    const item = items[index];

    if (item === undefined) {
        throw new Error(`Nothing at ${String(index)}`);
    }

    return item;
}

function raise(title: string, tone: 'error' | 'warning' = 'error') {
    act(() => {
        recordNotice({ title, tone });
    });
}

afterEach(() => {
    cleanup();

    shellStore.getState().reset();
});

describe('the notice centre', () => {
    it('counts what nobody has read on the bell', () => {
        draw();

        expect(screen.getByRole('button', { name: 'Avisos' })).toBeVisible();

        raise('No se pudo guardar');
        raise('Algo raro', 'warning');

        expect(screen.getByRole('button', { name: 'Avisos, 2 sin leer' })).toBeVisible();
    });

    it('says there is nothing to read when it is empty', () => {
        draw();
        fireEvent.click(screen.getByRole('button', { name: 'Avisos' }));

        expect(screen.getByRole('dialog', { name: 'Avisos' })).toHaveTextContent('Sin avisos');
    });

    it('opens on the notices and reads them all', () => {
        draw();
        raise('No se pudo guardar');
        fireEvent.click(screen.getByRole('button', { name: 'Avisos, 1 sin leer' }));

        const list = screen.getByRole('dialog', { name: 'Avisos' });

        expect(within(list).getByText('No se pudo guardar')).toBeVisible();
        expect(selectUnreadNotices(shellStore.getState())).toBe(0);
    });

    it('shows how many times a repeated notice happened', () => {
        draw();
        raise('No se pudo guardar');
        raise('No se pudo guardar');
        fireEvent.click(screen.getByRole('button', { name: 'Avisos, 1 sin leer' }));

        expect(screen.getByRole('dialog', { name: 'Avisos' })).toHaveTextContent('×2');
    });

    it('dismisses one row and clears the rest', () => {
        draw();
        raise('Uno');
        raise('Dos');
        fireEvent.click(screen.getByRole('button', { name: 'Avisos, 2 sin leer' }));
        fireEvent.click(at(screen.getAllByRole('button', { name: 'Borrar aviso' }), 0));

        expect(shellStore.getState().notices.map((notice) => notice.title)).toEqual(['Uno']);

        fireEvent.click(screen.getByRole('button', { name: 'Borrar todos' }));

        expect(screen.getByRole('dialog', { name: 'Avisos' })).toHaveTextContent('Sin avisos');
    });

    it('walks the rows with the arrows and deletes the focused one with Delete', () => {
        draw();
        raise('Uno');
        raise('Dos');
        fireEvent.click(screen.getByRole('button', { name: 'Avisos, 2 sin leer' }));

        const rows = screen.getAllByRole('listitem');
        const first = at(rows, 0);
        const second = at(rows, 1);

        act(() => {
            first.focus();
        });
        fireEvent.keyDown(first, { key: 'ArrowDown' });

        expect(second).toHaveFocus();

        fireEvent.keyDown(second, { key: 'Delete' });

        expect(shellStore.getState().notices.map((notice) => notice.title)).toEqual(['Dos']);
        expect(first).toHaveFocus();
    });

    it('runs the action its owner offered', () => {
        const onSelect = vi.fn();

        draw();
        act(() => {
            recordNotice({
                action: { label: 'Reintentar', onSelect },
                title: 'No se pudo sincronizar',
                tone: 'error',
            });
        });
        fireEvent.click(screen.getByRole('button', { name: 'Avisos, 1 sin leer' }));
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(onSelect).toHaveBeenCalledOnce();
    });

    /** The palette command reaches the centre through the surface it registers, not by name. */
    it('opens when the window is sent to its surface', () => {
        draw();

        act(() => {
            windowSurface('notices')?.open(shellStore.getState());
        });

        expect(screen.getByRole('dialog', { name: 'Avisos' })).toBeVisible();
    });
});

describe('NoticeCenterItem', () => {
    it('hangs the bell from the status line while it is mounted', () => {
        const { result } = renderHook(() => useStatusItems());
        const item = render(<NoticeCenterItem />);

        expect(result.current.map((each) => each.id)).toEqual(['notices']);
        expect(result.current[0]?.content).toMatchObject({ type: NoticeCenter });

        item.unmount();

        expect(result.current).toEqual([]);
    });
});
