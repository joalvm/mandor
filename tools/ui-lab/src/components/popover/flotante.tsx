import { Popover, PopoverPanel, type PopoverAnchor } from '@mandor/ui';
import { useRef, useState } from 'react';

/** Cuánto aguanta el panel mientras el puntero cruza del token al panel. */
const GRACIA_MS = 250;

/**
 * El panel que abre una variable: anclado al token donde cayó el puntero, sin tocar el foco —
 * el campo debajo sigue editándose. La gracia que lo deja alcanzar la pone quien lo abre.
 */
export function FlotanteDemo() {
    const [open, setOpen] = useState(false);
    const token = useRef<HTMLSpanElement | null>(null);
    const ancla = useRef<PopoverAnchor>({
        getBoundingClientRect: () => token.current?.getBoundingClientRect() ?? new DOMRect(),
    });
    const gracia = useRef(0);

    function alLlegar(): void {
        window.clearTimeout(gracia.current);
        setOpen(true);
    }

    function alSalirDelToken(): void {
        gracia.current = window.setTimeout(() => {
            setOpen(false);
        }, GRACIA_MS);
    }

    return (
        <p className="text-sm text-text-primary">
            URL del entorno:{' '}
            <span
                className="rounded-sm bg-surface-selected px-1 font-mono text-xs text-accent-strong"
                onPointerEnter={alLlegar}
                onPointerLeave={alSalirDelToken}
                ref={token}
            >
                {'{{base_url}}'}
            </span>
            <Popover anchor={ancla} modal={false} open={open}>
                <PopoverPanel autofocus={false} label="base_url">
                    <div
                        onPointerEnter={alLlegar}
                        onPointerLeave={() => {
                            setOpen(false);
                        }}
                    >
                        <p className="text-xs text-text-secondary">Valor en Local</p>
                        <p className="break-all font-mono text-xs text-text-primary">
                            https://gateway.local/v1
                        </p>
                    </div>
                </PopoverPanel>
            </Popover>
        </p>
    );
}
