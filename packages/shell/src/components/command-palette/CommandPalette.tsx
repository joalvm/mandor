import { useEffect, useRef, useState } from 'react';

import { PALETTE_SURFACE } from '../../command/window-commands.js';
import { registerSurface } from '../../command/window-surface.js';
import { useRecentCommands } from '../../hooks/useRecentCommands.js';
import { CommandPaletteList } from './CommandPaletteList.js';
import { phaseOnClosing, type PalettePhase } from './phase-on-closing.js';

/**
 * Everything the window knows how to do, at one key and a few letters.
 *
 * Not a modal: it asks the operating system nothing, confirms nothing that cannot be undone and
 * warns of no risk, which are the only three reasons to block the window. It is an overlay
 * anchored to the top, and `Escape` is enough to leave it, wherever the focus went; so is a
 * press anywhere outside it.
 *
 * Closing it is immediate for whoever uses it: the focus goes back at once and the box takes no
 * more presses. What lingers is the picture, fading out until the sheet says the fade ended.
 *
 * Whether it is open is its own business, and so is answering for the surface that opens it: a
 * window that had to hold the flag would be holding it for a component it does not read.
 *
 * What was run last is kept here and not inside the list, so it outlives closing the palette
 * without outliving the window.
 */
export function CommandPalette() {
    const [phase, setPhase] = useState<PalettePhase>('gone');
    // Each opening draws a fresh list, even over one that is still fading out.
    const [opening, setOpening] = useState(0);
    const [recent, remember] = useRecentCommands();
    const box = useRef<HTMLDivElement>(null);
    const open = phase === 'open';

    useEffect(
        () =>
            registerSurface({
                id: PALETTE_SURFACE,
                open: () => {
                    setPhase('open');
                    setOpening((count) => count + 1);
                },
            }),
        [],
    );

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        function close(): void {
            setPhase(phaseOnClosing(box.current));
        }

        function onPress(event: PointerEvent): void {
            if (event.target instanceof Node && box.current?.contains(event.target) !== true) {
                close();
            }
        }

        function onKey(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                close();
            }
        }

        document.addEventListener('pointerdown', onPress, true);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('pointerdown', onPress, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    useEffect(() => {
        const node = box.current;

        if (phase !== 'closing' || node === null) {
            return undefined;
        }

        function onEnd(event: AnimationEvent): void {
            if (event.target === node) {
                setPhase('gone');
            }
        }

        node.addEventListener('animationend', onEnd);

        return () => {
            node.removeEventListener('animationend', onEnd);
        };
    }, [phase]);

    if (phase === 'gone') {
        return null;
    }

    return (
        <div
            className={
                'fixed inset-x-0 top-16 z-popover mx-auto w-full max-w-xl rounded-panel ' +
                'border border-border-subtle bg-surface-raised p-2 shadow-popover'
            }
            data-part="command-palette"
            data-state={open ? 'open' : 'closed'}
            inert={!open}
            ref={box}
        >
            <CommandPaletteList
                active={open}
                key={opening}
                onClose={() => {
                    setPhase(phaseOnClosing(box.current));
                }}
                onRun={remember}
                recent={recent}
            />
        </div>
    );
}
