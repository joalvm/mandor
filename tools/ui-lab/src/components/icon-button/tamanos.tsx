import { IconButton } from '@mandor/ui';

const TAMANOS = [
    { label: 'xs', size: 'xs' },
    { label: 'sm', size: 'sm' },
    { label: 'md', size: 'md' },
] as const;

/** Los tres tamaños cuadrados: misma celda, misma leyenda; la única diferencia es la escala. */
export function TamanosDemo() {
    return (
        <div className="grid grid-cols-3 gap-gap-group">
            {TAMANOS.map(({ label, size }) => (
                <div className="flex flex-col items-center gap-gap-tight" key={size}>
                    <IconButton icon="add" label={`Añadir (${label})`} size={size} />
                    <span className="font-mono text-2xs text-text-secondary">{label}</span>
                </div>
            ))}
        </div>
    );
}
