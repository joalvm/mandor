import { CornerCount, IconButton } from '@mandor/ui';

/** La cuenta sobre la esquina del control: más chica que el glifo, nueve y más como tope. */
export function EsquinaDemo() {
    return (
        <div className="flex items-center gap-gap-control">
            <CornerCount count={2} tone="error">
                <IconButton
                    icon="console"
                    iconSize="sm"
                    label="Mostrar la consola, 2 errores"
                    size="xs"
                />
            </CornerCount>
            <CornerCount count={14} tone="accent">
                <IconButton icon="bell" iconSize="sm" label="Avisos, 14 sin leer" size="xs" />
            </CornerCount>
        </div>
    );
}
