import { SIDEBAR_WIDTH } from '@mandor/ipc';
import { useMessages } from '@mandor/i18n';
import { arrowPixels, arrowStep, usePointerDrag } from '@mandor/ui';
import type { KeyboardEvent } from 'react';

import { useShellStore } from '../../hooks/useShellStore.js';

/**
 * The edge of the sidebar, dragged in pixels. It is the gutter of the frame between the lateral
 * and the first card, and draws nothing at rest: the gutter already separates them. Pointed at,
 * a line shows down its middle, so the drag is found where it is.
 *
 * The width it moves is the one the session keeps, so the handle reads and writes it where it
 * lives instead of being handed it by whoever drew the window.
 */
export function SidebarResizer() {
    const messages = useMessages('shell');
    const width = useShellStore((state) => state.panels.sidebarWidth);
    const setPanels = useShellStore((state) => state.setPanels);

    function widen(sidebarWidth: number): void {
        setPanels({
            sidebarWidth: Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, sidebarWidth)),
        });
    }

    const drag = usePointerDrag((event, band) => {
        widen(event.clientX - band.getBoundingClientRect().left);
    });

    function onKeyDown(event: KeyboardEvent<HTMLElement>): void {
        const direction = arrowStep(event.key, 'row');

        if (direction === 0) {
            return;
        }

        event.preventDefault();
        widen(width + arrowPixels(event) * direction);
    }

    return (
        <div
            aria-label={messages('resizeSidebar')}
            aria-orientation="vertical"
            aria-valuemax={SIDEBAR_WIDTH.max}
            aria-valuemin={SIDEBAR_WIDTH.min}
            aria-valuenow={Math.round(width)}
            className="w-gap-gutter shrink-0 z-splitter before:absolute before:inset-y-0 before:left-1/2 before:w-px before:transition-colors before:duration-fast hover:before:bg-border-hover"
            data-part="sidebar-handle"
            {...drag}
            onDoubleClick={() => {
                widen(SIDEBAR_WIDTH.default);
            }}
            onKeyDown={onKeyDown}
            role="separator"
            tabIndex={0}
        />
    );
}
