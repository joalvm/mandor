import { useEffect, useRef, useState } from 'react';

import { PALETTE_SURFACE } from '../../command/window-commands.js';
import { registerSurface } from '../../command/window-surface.js';
import { useRecentCommands } from '../../hooks/useRecentCommands.js';
import { CommandPaletteList } from './CommandPaletteList.js';

/**
 * Everything the window knows how to do, at one key and a few letters.
 *
 * Not a modal: it asks the operating system nothing, confirms nothing that cannot be undone and
 * warns of no risk, which are the only three reasons to block the window. It is an overlay
 * anchored to the top, and `Escape` is enough to leave it, wherever the focus went; so is a
 * press anywhere outside it.
 *
 * Whether it is open is its own business, and so is answering for the surface that opens it: a
 * window that had to hold the flag would be holding it for a component it does not read.
 *
 * What was run last is kept here and not inside the list, so it outlives closing the palette
 * without outliving the window.
 */
export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [recent, remember] = useRecentCommands();
    const box = useRef<HTMLDivElement>(null);

    useEffect(
        () =>
            registerSurface({
                id: PALETTE_SURFACE,
                open: () => {
                    setOpen(true);
                },
            }),
        [],
    );

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function onPress(event: PointerEvent): void {
            if (event.target instanceof Node && box.current?.contains(event.target) !== true) {
                setOpen(false);
            }
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('pointerdown', onPress, true);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('pointerdown', onPress, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!open) {
        return null;
    }

    return (
        <div
            className={
                'fixed inset-x-0 top-16 z-popover mx-auto w-full max-w-xl rounded-lg ' +
                'border border-border-strong bg-surface-raised p-2 shadow-popover'
            }
            data-part="command-palette"
            ref={box}
        >
            <CommandPaletteList
                onClose={() => {
                    setOpen(false);
                }}
                onRun={remember}
                recent={recent}
            />
        </div>
    );
}
